package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Iterables;
import lombok.Getter;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
    protected IndexerForSearchSelector indexerPicker;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private ConfigProvider configProvider;


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
        searchResult.setPickingResult(searchCacheEntry.getPickingResult());

        Map<Indexer, List<IndexerSearchResult>> indexersToSearchAndTheirResults = getIndexerSearchResultsToSearch(searchCacheEntry.getIndexerSearchResultsByIndexer());
        List<SearchResultItem> searchResultItems = searchCacheEntry.getSearchResultItems();
        while (indexersToSearchAndTheirResults.size() > 0 && (searchResultItems.size() < numberOfWantedResults || searchRequest.isLoadAll())) {


            if (searchRequest.isLoadAll()) {
                logger.debug("Going to call {} indexers because {} results were loaded yet but more results are available and all were requested", indexersToSearchAndTheirResults.size(), searchCacheEntry.getNumberOfFoundResults());
            } else {
                logger.debug("Going to call {} indexers because {} of {} wanted results were loaded yet", indexersToSearchAndTheirResults.size(), searchCacheEntry.getNumberOfFoundResults(), numberOfWantedResults);
            }

            //Do the actual search
            indexersToSearchAndTheirResults = callSearchModules(searchRequest, indexersToSearchAndTheirResults);

            //Update cache
            searchCacheEntry.getIndexerSearchResultsByIndexer().putAll(indexersToSearchAndTheirResults);
            searchRequestCache.put(searchRequest.hashCode(), searchCacheEntry);


            //Use search result items from the cache which contains *all* search searchResults, not just the latest. That allows finding duplicates over multiple searches
            searchResultItems = searchCacheEntry.getIndexerSearchResultsByIndexer().values().stream().flatMap(Collection::stream).filter(IndexerSearchResult::isWasSuccessful).flatMap(x -> x.getSearchResultItems().stream()).distinct().collect(Collectors.toList());
            DuplicateDetectionResult duplicateDetectionResult = duplicateDetector.detectDuplicates(searchResultItems);

            //Save to database
            createOrUpdateIndexerSearchEntity(searchCacheEntry, indexersToSearchAndTheirResults, duplicateDetectionResult);

            //Remove duplicates for external searches
            if (searchRequest.getSource() == SearchSource.API) {
                int beforeDuplicateRemoval = searchResultItems.size();
                searchResultItems = getNewestSearchResultItemFromEachDuplicateGroup(duplicateDetectionResult.getDuplicateGroups());
                searchResult.setNumberOfRemovedDuplicates(beforeDuplicateRemoval - searchResultItems.size());
            }

            //Set the rejection counts from all searches, this and previous
            searchCacheEntry.getReasonsForRejection().clear();
            indexersToSearchAndTheirResults.values().forEach(x -> x.forEach(y -> y.getReasonsForRejection().entrySet().forEach(z -> searchCacheEntry.getReasonsForRejection().add(z.getElement(), z.getCount()))));

            //Update indexersToSearchAndTheirResults to remove indexers which threw an error or don't have any more results
            indexersToSearchAndTheirResults = getIndexerSearchResultsToSearch(indexersToSearchAndTheirResults);

            searchCacheEntry.setSearchResultItems(searchResultItems);
        }
        searchResult.setNumberOfTotalAvailableResults(searchCacheEntry.getNumberOfTotalAvailableResults());
        searchResult.setIndexerSearchResults(searchCacheEntry.getIndexerSearchResultsByIndexer().entrySet().stream().map(x -> Iterables.getLast(x.getValue())).collect(Collectors.toList()));
        searchResult.setReasonsForRejection(searchCacheEntry.getReasonsForRejection());
        searchResultItems.sort(Comparator.comparingLong(x -> x.getBestDate().getEpochSecond()));
        Collections.reverse(searchResultItems);

        spliceSearchResultItemsAccordingToOffsetAndLimit(searchRequest, searchResult, searchResultItems);

        logger.debug(LoggingMarkers.PERFORMANCE, "Internal search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResult;
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
        return duplicateGroups.stream().map(x -> {
            return x.stream().sorted(Comparator.comparingInt(SearchResultItem::getIndexerScore).reversed().thenComparing(Comparator.comparingLong((SearchResultItem y) -> y.getPubDate().getEpochSecond()).reversed())).iterator().next();
        }).sorted(Comparator.comparingLong((SearchResultItem x) -> x.getPubDate().getEpochSecond()).reversed()).collect(Collectors.toList());
    }

    private void createOrUpdateIndexerSearchEntity(SearchCacheEntry searchCacheEntry, Map<Indexer, List<IndexerSearchResult>> indexersToSearchAndTheirResults, DuplicateDetectionResult duplicateDetectionResult) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        int countEntities = 0;
        for (IndexerSearchResult indexerSearchResult : indexersToSearchAndTheirResults.values().stream().flatMap(List::stream).collect(Collectors.toList())) {
            IndexerSearchEntity entity = searchCacheEntry.getIndexerSearchEntitiesByIndexer().get(indexerSearchResult.getIndexer().getIndexerEntity());
            if (entity == null) {
                entity = new IndexerSearchEntity();
                entity.setIndexerEntity(indexerSearchResult.getIndexer().getIndexerEntity());
                entity.setSearchEntity(searchCacheEntry.getSearchEntity());
                entity.setResultsCount(indexerSearchResult.getTotalResults());
                entity.setSuccessful(indexerSearchResult.isWasSuccessful());
            }
            entity.setProcessedResults(indexerSearchResult.getSearchResultItems().size());
            entity.setUniqueResults(duplicateDetectionResult.getUniqueResultsPerIndexer().count(indexerSearchResult.getIndexer()));
            entity = indexerSearchRepository.save(entity);
            searchCacheEntry.getIndexerSearchEntitiesByIndexer().put(indexerSearchResult.getIndexer().getIndexerEntity(), entity);
            countEntities++;
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

            IndexerForSearchSelection pickingResult = indexerPicker.pickIndexers(searchRequest);
            searchCacheEntry = new SearchCacheEntry(searchRequest, pickingResult, searchEntity);
        } else {
            searchCacheEntry = searchRequestCache.get(searchRequest.hashCode());
            searchCacheEntry.setLastAccessed(Instant.now());
            searchCacheEntry.setSearchRequest(searchRequest); //Update to latest to keep offset and limit updated
        }
        return searchCacheEntry;
    }


    protected Map<Indexer, List<IndexerSearchResult>> getIndexerSearchResultsToSearch(Map<Indexer, List<IndexerSearchResult>> map) {
        return map.entrySet().stream().filter(x -> {
            if (x.getValue().isEmpty()) {
                return true;
            }
            IndexerSearchResult latestIndexerSearchResult = Iterables.getLast(x.getValue());
            return latestIndexerSearchResult.isHasMoreResults() && latestIndexerSearchResult.isWasSuccessful();
        }).collect(Collectors.toMap(Entry::getKey, Entry::getValue));
    }

    protected Map<Indexer, List<IndexerSearchResult>> callSearchModules(SearchRequest searchRequest, Map<Indexer, List<IndexerSearchResult>> indexersToSearch) {
        Map<Indexer, List<IndexerSearchResult>> indexerSearchResults = new HashMap<>(indexersToSearch);

        ExecutorService executor = MdcThreadPoolExecutor.newWithInheritedMdc(indexersToSearch.size());

        List<Callable<IndexerSearchResult>> callables = getCallables(searchRequest, indexersToSearch);

        try {
            List<Future<IndexerSearchResult>> futures = executor.invokeAll(callables);
            for (Future<IndexerSearchResult> future : futures) {
                try {
                    IndexerSearchResult indexerSearchResult = future.get();
                    List<IndexerSearchResult> previousIndexerSearchResults = indexerSearchResults.get(indexerSearchResult.getIndexer());
                    previousIndexerSearchResults.add(indexerSearchResult);
                    indexerSearchResults.put(indexerSearchResult.getIndexer(), previousIndexerSearchResults);
                } catch (ExecutionException e) {
                    logger.error("Unexpected error while searching", e);
                }
            }
        } catch (InterruptedException e) {
            logger.error("Unexpected error while searching", e);
        }
        executor.shutdownNow(); //Need to explicitly shutdown executor for threads to be closed
        indexerSearchResults = handleIndexersWithFailedFutureExecutions(indexersToSearch, indexerSearchResults);
        return indexerSearchResults;
    }


    private Map<Indexer, List<IndexerSearchResult>> handleIndexersWithFailedFutureExecutions(Map<Indexer, List<IndexerSearchResult>> indexersToSearch, Map<Indexer, List<IndexerSearchResult>> indexerSearchResults) {
        for (Entry<Indexer, List<IndexerSearchResult>> entry : indexersToSearch.entrySet()) {
            if (!indexerSearchResults.containsKey(entry.getKey())) {
                IndexerSearchResult unknownFailureSearchResult = new IndexerSearchResult();
                unknownFailureSearchResult.setWasSuccessful(false);
                unknownFailureSearchResult.setHasMoreResults(false);
                unknownFailureSearchResult.setErrorMessage("Unexpected error. Please check the log.");
                List<IndexerSearchResult> previousIndexerSearchResults = indexersToSearch.get(entry.getKey());
                previousIndexerSearchResults.add(unknownFailureSearchResult);
                indexerSearchResults.put(entry.getKey(), previousIndexerSearchResults);
            }
        }
        return indexerSearchResults;
    }

    private List<Callable<IndexerSearchResult>> getCallables(SearchRequest searchRequest, Map<Indexer, List<IndexerSearchResult>> indexersToSearch) {
        List<Callable<IndexerSearchResult>> callables = new ArrayList<>();

        for (Entry<Indexer, List<IndexerSearchResult>> entry : indexersToSearch.entrySet()) {
            Callable<IndexerSearchResult> callable = getIndexerCallable(searchRequest, entry);
            callables.add(callable);
        }
        return callables;
    }

    private Callable<IndexerSearchResult> getIndexerCallable(SearchRequest searchRequest, Entry<Indexer, List<IndexerSearchResult>> entry) {
        int offset;
        int limit;
        if (entry.getValue().isEmpty()) {
            offset = 0;
            limit = 100; //LATER Set either global default or get from indexerName or implement possibility to keep this unset and let indexer implementation decide
        } else {
            IndexerSearchResult indexerToSearch = Iterables.getLast(entry.getValue());
            offset = indexerToSearch.getOffset() + indexerToSearch.getLimit();
            limit = indexerToSearch.getLimit();
        }
        return () -> entry.getKey().search(searchRequest, offset, limit);
    }

    @Getter
    public static class SearchEvent {
        private SearchRequest searchRequest;

        public SearchEvent(SearchRequest searchRequest) {
            this.searchRequest = searchRequest;
        }
    }


}
