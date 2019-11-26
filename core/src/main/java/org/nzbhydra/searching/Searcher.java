package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import lombok.Getter;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.*;
import org.nzbhydra.searching.dtoseventsenums.DuplicateDetectionResult;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Component
public class Searcher {

    private static final Logger logger = LoggerFactory.getLogger(Searcher.class);

    @Autowired
    protected DuplicateDetector duplicateDetector;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    protected IndexerForSearchSelector indexerSelector;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private ConfigProvider configProvider;
    private final Set<ExecutorService> executors = Collections.synchronizedSet(new HashSet<>());
    private boolean shutdownRequested = false;

    /**
     * Maps a search request's hash to its cache entry
     */
    private final Map<Integer, SearchCacheEntry> searchRequestCache = ExpiringMap.builder()
        .maxSize(20)
        .expirationPolicy(ExpirationPolicy.ACCESSED)
        .expiration(5, TimeUnit.MINUTES)
        .expirationListener((k, v) -> logger.debug("Removing expired search cache entry {}", ((SearchCacheEntry) v).getSearchRequest()))
        .build();

    public SearchResult search(SearchRequest searchRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        eventPublisher.publishEvent(new SearchEvent(searchRequest));
        SearchCacheEntry searchCacheEntry = getSearchCacheEntry(searchRequest);

        SearchResult searchResult = new SearchResult();
        int numberOfWantedResults = searchRequest.getOffset().orElse(0) + searchRequest.getLimit().orElse(100); //LATER default for limit
        searchResult.setIndexerSelectionResult(searchCacheEntry.getIndexerSelectionResult());
        searchResult.setNumberOfRemovedDuplicates(searchCacheEntry.getNumberOfRemovedDuplicates());

        List<IndexerSearchCacheEntry> indexersToSearch = getIndexersToSearch(searchCacheEntry);
        List<IndexerSearchCacheEntry> indexersWithCachedResults = getIndexersWithCachedResults(searchCacheEntry);
        List<SearchResultItem> searchResultItems = searchCacheEntry.getSearchResultItems();
        while ((!indexersToSearch.isEmpty() || !indexersWithCachedResults.isEmpty()) && (searchResultItems.size() < numberOfWantedResults || searchRequest.isLoadAll())) {
            if (shutdownRequested) {
                break;
            }
            if (searchRequest.isLoadAll()) {
                logger.debug("Going to call {} indexers because {} results were loaded yet but more results are available and all were requested", indexersToSearch.size(), searchCacheEntry.getNumberOfFoundResults());
                int maxResultsToLoad = searchCacheEntry.getNumberOfAvailableResults();
                if (searchResultItems.size() > maxResultsToLoad) {
                    logger.info("Aborting loading all results because more than {} results were already loaded and we don't want to hammer the indexers too much", maxResultsToLoad);
                    break;
                }
            } else {
                logger.debug("Going to call {} indexers because {} of {} wanted results were loaded yet", indexersToSearch.size(), searchCacheEntry.getNumberOfFoundResults(), numberOfWantedResults);
            }

            //Do the actual search
            if (!indexersToSearch.isEmpty()) {
                callSearchModules(searchRequest, indexersToSearch, searchCacheEntry);
                //Update so indexers with errors are removed
                indexersToSearch = getIndexersToSearch(searchCacheEntry);
            }

            indexersWithCachedResults = getIndexersWithCachedResults(searchCacheEntry);
            while (searchResultItems.size() < numberOfWantedResults && !indexersWithCachedResults.isEmpty()) {
                List<SearchResultItem> newestItemsFromIndexers = indexersWithCachedResults.stream().map(IndexerSearchCacheEntry::peek).sorted(Comparator.comparingLong(x -> ((SearchResultItem) x).getBestDate().getEpochSecond()).reversed()).collect(Collectors.toList());
                SearchResultItem newestResult = newestItemsFromIndexers.get(0);
                Indexer newestResultIndexer = newestResult.getIndexer();
                IndexerSearchCacheEntry newestIndexerSearchCacheEntry = searchCacheEntry.getIndexerCacheEntries().get(newestResultIndexer);
                searchResultItems.add(newestIndexerSearchCacheEntry.pop());

                indexersWithCachedResults = getIndexersWithCachedResults(searchCacheEntry);
                if (!newestIndexerSearchCacheEntry.isMoreResultsInCache() && newestIndexerSearchCacheEntry.isMoreResultsAvailable()) {
                    indexersToSearch.add(newestIndexerSearchCacheEntry);
                    //We need to make a new search for that indexer so we can't continue here
                    break;
                }
            }

            searchRequestCache.put(searchRequest.hashCode(), searchCacheEntry);

            //todo: Would be better if duplicate detection would be executed when each indexer's search result items are filled from the new indexerSearchResults
            //That way they wouldn't be considered eligable and this loop wouldn't be executed as often

            DuplicateDetectionResult duplicateDetectionResult = duplicateDetector.detectDuplicates(new HashSet<>(searchResultItems));

            //Save to database
            createOrUpdateIndexerSearchEnties(searchCacheEntry);

            //Remove duplicates for external searches
            if (searchRequest.getSource() == SearchSource.API) {
                int beforeDuplicateRemoval = searchResultItems.size();
                searchResultItems = getNewestSearchResultItemFromEachDuplicateGroup(duplicateDetectionResult.getDuplicateGroups());
                searchResult.setNumberOfRemovedDuplicates(searchResult.getNumberOfRemovedDuplicates() + (beforeDuplicateRemoval - searchResultItems.size()));
            }

            //Set the rejection counts from all searches, this and previous
            searchCacheEntry.getReasonsForRejection().clear();
            for (IndexerSearchCacheEntry indexerSearchCacheEntry : searchCacheEntry.getIndexerCacheEntries().values()) {
                for (IndexerSearchResult indexerSearchResult : indexerSearchCacheEntry.getIndexerSearchResults()) {
                    for (Multiset.Entry<String> rejectionEntry : indexerSearchResult.getReasonsForRejection().entrySet()) {
                        searchCacheEntry.getReasonsForRejection().add(rejectionEntry.getElement(), rejectionEntry.getCount());
                    }
                }
            }

            //todo:
            searchCacheEntry.setSearchResultItems(new ArrayList<>(searchResultItems));
//            searchCacheEntry.setSearchResultItems(new ArrayList<>(allExistingSearchResultItems));
        }
        searchResult.setNumberOfTotalAvailableResults(searchCacheEntry.getNumberOfTotalAvailableResults());
        searchResult.setIndexerSearchResults(searchCacheEntry.getIndexerCacheEntries().values().stream().map(x -> Iterables.getLast(x.getIndexerSearchResults())).collect(Collectors.toList()));
        searchResult.setReasonsForRejection(searchCacheEntry.getReasonsForRejection());
        searchCacheEntry.setNumberOfRemovedDuplicates(searchResult.getNumberOfRemovedDuplicates());

        List<SearchResultItem> searchResultItemsToReturn = new ArrayList<>(searchResultItems);
        searchResultItemsToReturn.sort(Comparator.comparingLong(x -> ((SearchResultItem) x).getBestDate().getEpochSecond()).reversed());

        spliceSearchResultItemsAccordingToOffsetAndLimit(searchRequest, searchResult, searchResultItemsToReturn);

        logger.debug(LoggingMarkers.PERFORMANCE, "Internal search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResult;
    }

    private List<IndexerSearchCacheEntry> getIndexersWithCachedResults(SearchCacheEntry searchCacheEntry) {
        return searchCacheEntry.getIndexerCacheEntries().values().stream()
            .filter(IndexerSearchCacheEntry::isMoreResultsInCache)
            .collect(Collectors.toList());
    }

    private void spliceSearchResultItemsAccordingToOffsetAndLimit(SearchRequest searchRequest, SearchResult searchResult, List<SearchResultItem> searchResultItems) {
        int offset = searchRequest.getOffset().orElse(0);
        int limit = searchRequest.getLimit().orElse(100); //LATER configurable

        if (searchRequest.getSource() == SearchSource.INTERNAL && offset == 0 && limit == 100 && configProvider.getBaseConfig().getSearching().isLoadAllCachedOnInternal()) {
            logger.debug("Will load all cached results");
            limit = searchResultItems.size();
        }

        if (searchRequest.isLoadAll()) {
            logger.info("Returning all available search results");
            searchResult.setSearchResultItems(searchResultItems);
            return;
        }

        if (offset > 0 && offset >= searchResultItems.size()) {
            logger.info("Offset {} exceeds the number of available results {}; returning empty search result", offset, searchResultItems.size());
            searchResult.setSearchResultItems(Collections.emptyList());
            return;
        }
        if (offset + limit > searchResultItems.size()) {
            logger.debug("Offset {} + limit {} exceeds the number of available results {}; returning all remaining results from cache", offset, limit, searchResultItems.size());
            limit = searchResultItems.size() - offset;
        }

        if (limit != 0) {
            searchResult.setOffset(offset);
            searchResult.setLimit(limit);
            String andRemoved = "";
            if (searchRequest.getSource() == SearchSource.API) {
                andRemoved = " and " + searchResult.getNumberOfRemovedDuplicates() + " were removed as duplicates";
            }
            logger.info("Returning results {}-{} from {} results in cache. A total of {} results is available from indexers of which {} were already rejected" + andRemoved, offset + 1, offset + limit, searchResultItems.size(), searchResult.getNumberOfTotalAvailableResults(), searchResult.getNumberOfRejectedResults());
            searchResult.setSearchResultItems(searchResultItems.subList(offset, offset + limit));
        }
    }

    protected List<SearchResultItem> getNewestSearchResultItemFromEachDuplicateGroup(List<LinkedHashSet<SearchResultItem>> duplicateGroups) {
        //Sort duplicate groups internally, map to list, sort the results
        return duplicateGroups.stream().map(x -> x.stream()
            .sorted(Comparator.comparingInt((SearchResultItem searchResultItem) -> searchResultItem.getIndexerScore() == null ? 0 : searchResultItem.getIndexerScore())
                .reversed()
                .thenComparing(Comparator.comparingLong((SearchResultItem y) -> y.getBestDate().getEpochSecond())
                    .reversed())
            )
            .iterator().next()
        ).
            sorted(Comparator.comparingLong((SearchResultItem x) -> x.getBestDate().getEpochSecond())
                .reversed()
            )
            .collect(Collectors.toList());
    }

    private void createOrUpdateIndexerSearchEnties(SearchCacheEntry searchCacheEntry) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        int countEntities = 0;

        for (IndexerSearchCacheEntry indexerSearchCacheEntry : searchCacheEntry.getIndexerCacheEntries().values()) {
            for (IndexerSearchResult indexerSearchResult : indexerSearchCacheEntry.getIndexerSearchResults()) {
                IndexerSearchEntity entity = indexerSearchCacheEntry.getIndexerSearchEntity();
                if (entity == null) {
                    entity = new IndexerSearchEntity();
                    entity.setIndexerEntity(indexerSearchResult.getIndexer().getIndexerEntity());
                    entity.setSearchEntity(searchCacheEntry.getSearchEntity());
                    entity.setResultsCount(indexerSearchResult.getTotalResults());
                    entity.setSuccessful(indexerSearchResult.isWasSuccessful());
                }
                for (SearchResultEntity x : indexerSearchResult.getSearchResultEntities()) {
                    x.setIndexerSearchEntity(entity);
                }
                entity = indexerSearchRepository.save(entity);
                searchResultRepository.saveAll(indexerSearchResult.getSearchResultEntities());
                searchCacheEntry.getIndexerCacheEntries().get(indexerSearchResult.getIndexer()).setIndexerSearchEntity(entity);
                countEntities++;
            }
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Saving {} indexer search entities took {}ms", countEntities, stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

    protected SearchCacheEntry getSearchCacheEntry(SearchRequest searchRequest) {
        SearchCacheEntry searchCacheEntry;

        if (searchRequest.getOffset().orElse(0) == 0 || !searchRequestCache.containsKey(searchRequest.hashCode())) {
            //New search
            SearchEntity searchEntity = new SearchEntity();
            searchEntity.setSource(searchRequest.getSource());
            searchEntity.setCategoryName(searchRequest.getCategory().getName());
            searchEntity.setQuery(searchRequest.getQuery().orElse(null));
            searchEntity.setIdentifiers(searchRequest.getIdentifiers().entrySet().stream().filter(x -> x.getValue() != null).map(x -> new IdentifierKeyValuePair(x.getKey().name(), x.getValue())).collect(Collectors.toSet()));
            searchEntity.setSeason(searchRequest.getSeason().orElse(null));
            searchEntity.setEpisode(searchRequest.getEpisode().orElse(null));
            searchEntity.setSearchType(searchRequest.getSearchType());
            searchEntity.setTitle(searchRequest.getTitle().orElse(null));
            searchEntity.setAuthor(searchRequest.getAuthor().orElse(null));

            //Extend search request
            searchRequest.extractForbiddenWords();

            searchRepository.save(searchEntity);

            IndexerForSearchSelection pickingResult = indexerSelector.pickIndexers(searchRequest);
            searchCacheEntry = new SearchCacheEntry(searchRequest, pickingResult, searchEntity);
        } else {
            searchCacheEntry = searchRequestCache.get(searchRequest.hashCode());
            searchCacheEntry.setLastAccessed(Instant.now());
            searchCacheEntry.setSearchRequest(searchRequest); //Update to latest to keep offset and limit updated
        }
        return searchCacheEntry;
    }


    protected List<IndexerSearchCacheEntry> getIndexersToSearch(SearchCacheEntry searchCacheEntry) {
        List<IndexerSearchCacheEntry> indexerSearchCacheEntries = new ArrayList<>();
        for (Indexer selectedIndexer : searchCacheEntry.getIndexerSelectionResult().getSelectedIndexers()) {
            searchCacheEntry.getIndexerCacheEntries().putIfAbsent(selectedIndexer, new IndexerSearchCacheEntry(selectedIndexer));
        }

        for (IndexerSearchCacheEntry indexerSearchCacheEntry : searchCacheEntry.getIndexerCacheEntries().values()) {
            if (indexerSearchCacheEntry.getIndexerSearchResults().isEmpty()) {
                indexerSearchCacheEntries.add(indexerSearchCacheEntry);
                continue;
            }
            boolean indexerHasMoreResults = indexerSearchCacheEntry.isMoreResultsAvailable();
            boolean lastRequestSuccessful = indexerSearchCacheEntry.isLastSuccessful();
            boolean cacheEmpty = !indexerSearchCacheEntry.isMoreResultsInCache();
            if (indexerHasMoreResults && lastRequestSuccessful && cacheEmpty) {
                indexerSearchCacheEntries.add(indexerSearchCacheEntry);
            }
        }

        return indexerSearchCacheEntries;
    }

    protected Map<Indexer, List<IndexerSearchResult>> callSearchModules(SearchRequest searchRequest, List<IndexerSearchCacheEntry> indexersToSearch, SearchCacheEntry searchCacheEntry) {
        Map<Indexer, List<IndexerSearchResult>> indexerSearchResults = new HashMap<>();
        for (IndexerSearchCacheEntry entry : indexersToSearch) {
            indexerSearchResults.put(entry.getIndexer(), entry.getIndexerSearchResults());
        }

        ExecutorService executor = MdcThreadPoolExecutor.newWithInheritedMdc(indexersToSearch.size());
        executors.add(executor);

        List<Callable<IndexerSearchResult>> callables = getCallables(searchRequest, indexersToSearch);

        try {
            List<Future<IndexerSearchResult>> futures = executor.invokeAll(callables);
            for (Future<IndexerSearchResult> future : futures) {
                try {
                    IndexerSearchResult indexerSearchResult = future.get();
                    searchCacheEntry.getIndexerCacheEntries().get(indexerSearchResult.getIndexer()).addIndexerSearchResult(indexerSearchResult);
                    indexerSearchResults.put(indexerSearchResult.getIndexer(), searchCacheEntry.getIndexerCacheEntries().get(indexerSearchResult.getIndexer()).getIndexerSearchResults());
                } catch (ExecutionException e) {
                    logger.error("Unexpected error while searching", e);
                }
            }
        } catch (InterruptedException e) {
            logger.error("Unexpected error while searching", e);
        } finally {
            executor.shutdownNow(); //Need to explicitly shutdown executor for threads to be closed
        }
        executors.remove(executor);
        handleIndexersWithFailedFutureExecutions(indexersToSearch, indexerSearchResults);
        return indexerSearchResults;
    }


    private void handleIndexersWithFailedFutureExecutions(List<IndexerSearchCacheEntry> indexerSearchCacheEntries, Map<Indexer, List<IndexerSearchResult>> indexerSearchResults) {
        for (IndexerSearchCacheEntry toSearch : indexerSearchCacheEntries) {
            if (!indexerSearchResults.containsKey(toSearch.getIndexer())) {
                IndexerSearchResult unknownFailureSearchResult = new IndexerSearchResult();
                unknownFailureSearchResult.setWasSuccessful(false);
                unknownFailureSearchResult.setHasMoreResults(false);
                unknownFailureSearchResult.setErrorMessage("Unexpected error. Please check the log.");
                List<IndexerSearchResult> previousIndexerSearchResults = indexerSearchResults.get(toSearch.getIndexer());
                previousIndexerSearchResults.add(unknownFailureSearchResult);
                indexerSearchResults.put(toSearch.getIndexer(), previousIndexerSearchResults);
            }
        }
    }

    private List<Callable<IndexerSearchResult>> getCallables(SearchRequest searchRequest, List<IndexerSearchCacheEntry> indexersToSearch) {
        List<Callable<IndexerSearchResult>> callables = new ArrayList<>();

        for (IndexerSearchCacheEntry toSearch : indexersToSearch) {
            Callable<IndexerSearchResult> callable = getIndexerCallable(searchRequest, toSearch);
            callables.add(callable);
        }

        return callables;
    }

    private Callable<IndexerSearchResult> getIndexerCallable(SearchRequest searchRequest, IndexerSearchCacheEntry indexerSearchCacheEntry) {
        int offset;
        int limit;
        if (indexerSearchCacheEntry.getIndexerSearchResults().isEmpty()) {
            offset = 0;
            limit = 100; //LATER Set either global default or get from indexerName or implement possibility to keep this unset and let indexer implementation decide
        } else {
            IndexerSearchResult indexerToSearch = Iterables.getLast(indexerSearchCacheEntry.getIndexerSearchResults());
            offset = indexerToSearch.getOffset() + indexerToSearch.getLimit();
            limit = indexerToSearch.getLimit();
        }
        return () -> indexerSearchCacheEntry.getIndexer().search(searchRequest, offset, limit);
    }

    @SuppressWarnings("unused")
    @EventListener
    public void onShutdown(ShutdownEvent event) {
        shutdownRequested = true;
        synchronized (executors) {
            if (executors.size() > 0) {
                logger.debug("Waiting up to 10 seconds for {} background tasks to finish", executors.size());
            }
            for (ExecutorService executorService : executors) {
                executorService.shutdown();
                try {
                    executorService.awaitTermination(10, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    logger.warn("Waited too long for termination of task, interrupting");
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    @Getter
    public static class SearchEvent {

        private SearchRequest searchRequest;

        public SearchEvent(SearchRequest searchRequest) {
            this.searchRequest = searchRequest;
        }

    }

}
