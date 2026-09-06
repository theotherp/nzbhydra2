package org.nzbhydra.searching;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Iterables;
import jakarta.annotation.PreDestroy;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class Searcher {

    private static final int LOAD_LIMIT_API = 500;

    private static final Logger logger = LoggerFactory.getLogger(Searcher.class);

    private final DuplicateDetector duplicateDetector;
    private final IndexerForSearchSelector indexerSelector;
    private final ApplicationEventPublisher eventPublisher;
    private final ConfigProvider configProvider;
    private final SearchPersister searchPersister;

    private final Set<ExecutorService> executors = Collections.synchronizedSet(new HashSet<>());
    /**
     * Maps a search request's ID to the state of the search currently running for it.
     */
    private final Map<Long, ActiveSearch> activeSearches = ExpiringMap.builder()
            .maxSize(10)
            .expiration(5, TimeUnit.MINUTES) //This should be more than enough... Nobody will wait that long
            .expirationPolicy(ExpirationPolicy.ACCESSED)
            .build();
    private boolean shutdownRequested = false;

    /**
     * Maps a search request's identifying data to its cache entry
     */
    private final Map<SearchCacheKey, SearchCacheEntry> searchRequestCache = ExpiringMap.builder()
            .maxSize(20)
            .expirationPolicy(ExpirationPolicy.ACCESSED)
            .expiration(5, TimeUnit.MINUTES)
            .expirationListener((k, v) -> logger.debug("Removing expired search cache entry {}", ((SearchCacheEntry) v).getSearchRequest()))
            .build();

    public Searcher(DuplicateDetector duplicateDetector, IndexerForSearchSelector indexerSelector, ApplicationEventPublisher eventPublisher, ConfigProvider configProvider, SearchPersister searchPersister) {
        this.duplicateDetector = duplicateDetector;
        this.indexerSelector = indexerSelector;
        this.eventPublisher = eventPublisher;
        this.configProvider = configProvider;
        this.searchPersister = searchPersister;
    }

    public SearchResult search(SearchRequest searchRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        eventPublisher.publishEvent(new SearchEvent(searchRequest));
        SearchCacheEntry searchCacheEntry = getSearchCacheEntry(searchRequest);

        SearchResult searchResult = new SearchResult();
        int numberOfWantedResults = searchRequest.getOffset() + searchRequest.getLimit();
        searchResult.setIndexerSelectionResult(searchCacheEntry.getIndexerSelectionResult());

        //Register before any indexer is queried so that a shortcut request can never be lost
        ActiveSearch activeSearch = new ActiveSearch();
        if (searchRequest.isShortcut()) {
            activeSearch.shortcutRequested = true;
        }
        activeSearches.put(searchRequest.getSearchRequestId(), activeSearch);

        while (!shutdownRequested && !activeSearch.shortcutRequested) {
            List<IndexerSearchCacheEntry> indexersToSearch = searchCacheEntry.getIndexersToSearch();
            if (indexersToSearch.isEmpty() && searchCacheEntry.getIndexersWithCachedResults().isEmpty()) {
                break;
            }
            if (searchCacheEntry.getSearchResultItems().size() >= numberOfWantedResults && !searchRequest.isLoadAll()) {
                break;
            }
            if (searchRequest.isLoadAll()) {
                int maxResultsToLoad = searchCacheEntry.getNumberOfTotalAvailableResults();
                if (searchCacheEntry.getSearchResultItems().size() > maxResultsToLoad) {
                    logger.info("Aborting loading all results because more than {} results were already loaded and we don't want to hammer the indexers too much", maxResultsToLoad);
                    break;
                }
            }

            //Do the actual search
            if (!indexersToSearch.isEmpty()) {
                List<IndexerSearchResult> newIndexerSearchResults = queryIndexers(searchRequest, indexersToSearch, activeSearch);
                //Group the new items right away so that the merge can decide which of them to return
                List<SearchResultItem> newItems = newIndexerSearchResults.stream()
                    .flatMap(x -> x.getSearchResultItems().stream())
                    .collect(Collectors.toList());
                duplicateDetector.addToGroups(searchCacheEntry.getDuplicateGroups(), newItems);
            }

            searchCacheEntry.mergeCachedResults();

            //Save to database
            searchPersister.persistNewIndexerSearchResults(searchCacheEntry);

            //Set the rejection counts from all searches, this and previous
            searchCacheEntry.updateReasonsForRejection();
        }
        activeSearches.remove(searchRequest.getSearchRequestId());

        searchResult.setNumberOfFoundDuplicates(searchCacheEntry.getDuplicateGroups().getNumberOfDuplicates());
        searchResult.setNumberOfRemovedDuplicates(searchCacheEntry.getNumberOfRemovedDuplicates());

        searchResult.setNumberOfTotalAvailableResults(searchCacheEntry.getNumberOfTotalAvailableResults());
        searchResult.setIndexerSearchResults(searchCacheEntry.getIndexerCacheEntries().values().stream()
            .filter(x -> !x.getIndexerSearchResults().isEmpty())
            .map(x -> Iterables.getLast(x.getIndexerSearchResults()))
            .collect(Collectors.toList()));
        searchResult.setReasonsForRejection(searchCacheEntry.getReasonsForRejection());

        List<SearchResultItem> searchResultItemsToReturn = new ArrayList<>(searchCacheEntry.getSearchResultItems());
        searchResultItemsToReturn.forEach(item -> item.setSearchId(searchCacheEntry.getSearchEntity().getId()));
        searchResultItemsToReturn.sort(SearchResultItem.NEWEST_FIRST);

        spliceSearchResultItemsAccordingToOffsetAndLimit(searchRequest, searchResult, searchResultItemsToReturn);

        logger.debug(LoggingMarkers.PERFORMANCE, "Internal search took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return searchResult;
    }

    private void spliceSearchResultItemsAccordingToOffsetAndLimit(SearchRequest searchRequest, SearchResult searchResult, List<SearchResultItem> searchResultItems) {
        int offset = searchRequest.getOffset();
        int limit = searchRequest.getLimit();
        searchResult.setOffset(offset);
        searchResult.setLimit(limit);

        if (searchRequest.getSource() == SearchSource.INTERNAL
                && offset == 0
                && configProvider.getBaseConfig().getSearching().isLoadAllCachedOnInternal()) {
            logger.debug("Will load all cached results");
            limit = searchResultItems.size();
            searchResult.setLimit(limit);
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
            searchResult.setLimit(limit);
        }

        if (limit != 0) {
            String andRemoved = "";
            if (searchRequest.getSource() == SearchSource.API) {
                andRemoved = " and " + searchResult.getNumberOfRemovedDuplicates() + " were removed as duplicates";
            }
            logger.info("Returning results {}-{} from {} results in cache. A total of {} results is available from indexers of which {} were already rejected" + andRemoved, offset + 1, offset + limit, searchResultItems.size(), searchResult.getNumberOfTotalAvailableResults(), searchResult.getNumberOfRejectedResults());
            searchResult.setSearchResultItems(searchResultItems.subList(offset, offset + limit));
        }
    }

    protected SearchCacheEntry getSearchCacheEntry(SearchRequest searchRequest) {
        //The search entity must contain the query as entered by the user, so remember it before it's changed
        String rawQuery = searchRequest.getQuery().orElse(null);
        //Extending the request is idempotent but must happen before the cache key is calculated so that the same
        //query results in the same key on every page
        searchRequest.extractQueryAndForbiddenWords();
        SearchCacheKey searchCacheKey = SearchCacheKey.of(searchRequest);

        SearchCacheEntry searchCacheEntry;
        if (searchRequest.getOffset() == 0 || !searchRequestCache.containsKey(searchCacheKey)) {
            //New search
            SearchEntity searchEntity = searchPersister.createSearchEntity(searchRequest, rawQuery);
            IndexerForSearchSelection pickingResult = indexerSelector.pickIndexers(searchRequest);
            searchCacheEntry = new SearchCacheEntry(searchRequest, pickingResult, searchEntity);
        } else {
            searchCacheEntry = searchRequestCache.get(searchCacheKey);
            searchCacheEntry.setLastAccessed(Instant.now());
            searchCacheEntry.setSearchRequest(searchRequest); //Update to latest to keep offset and limit updated
        }
        searchRequestCache.put(searchCacheKey, searchCacheEntry);
        return searchCacheEntry;
    }

    /**
     * Queries all indexers whose caches are exhausted in parallel and adds the results to their cache entries.
     *
     * @return the results added in this round, including the ones created for indexers which failed unexpectedly
     */
    protected List<IndexerSearchResult> queryIndexers(SearchRequest searchRequest, List<IndexerSearchCacheEntry> indexersToSearch, ActiveSearch activeSearch) {
        ExecutorService executor = MdcThreadPoolExecutor.newWithInheritedMdc(indexersToSearch.size());
        executors.add(executor);
        List<IndexerSearchResult> newIndexerSearchResults = new ArrayList<>();

        try {
            List<SubmittedSearch> submittedSearches = new ArrayList<>();
            for (IndexerSearchCacheEntry indexerSearchCacheEntry : indexersToSearch) {
                Future<IndexerSearchResult> future = executor.submit(getIndexerCallable(searchRequest, indexerSearchCacheEntry));
                submittedSearches.add(new SubmittedSearch(indexerSearchCacheEntry, future));
                activeSearch.futures.add(future);
                if (activeSearch.shortcutRequested) {
                    //A shortcut may have arrived between submitting and registering the future
                    future.cancel(true);
                }
            }

            for (SubmittedSearch submittedSearch : submittedSearches) {
                try {
                    IndexerSearchResult indexerSearchResult = submittedSearch.future().get();
                    submittedSearch.entry().addIndexerSearchResult(indexerSearchResult);
                    newIndexerSearchResults.add(indexerSearchResult);
                } catch (ExecutionException e) {
                    logger.error("Unexpected error while searching", e);
                    IndexerSearchResult unknownFailureSearchResult = buildUnknownFailureSearchResult(submittedSearch.entry());
                    submittedSearch.entry().addIndexerSearchResult(unknownFailureSearchResult);
                    newIndexerSearchResults.add(unknownFailureSearchResult);
                } catch (CancellationException e) {
                    logger.debug("Cancellation of call expected");
                    activeSearch.shortcutRequested = true;
                    searchRequest.setShortcut(true);
                }
            }
        } catch (InterruptedException e) {
            logger.error("Unexpected error while searching", e);
            Thread.currentThread().interrupt();
        } finally {
            activeSearch.futures.clear();
            executor.shutdownNow(); //Need to explicitly shutdown executor for threads to be closed
            executors.remove(executor);
        }
        return newIndexerSearchResults;
    }

    private IndexerSearchResult buildUnknownFailureSearchResult(IndexerSearchCacheEntry indexerSearchCacheEntry) {
        IndexerSearchResult unknownFailureSearchResult = new IndexerSearchResult();
        unknownFailureSearchResult.setIndexer(indexerSearchCacheEntry.getIndexer());
        unknownFailureSearchResult.setWasSuccessful(false);
        unknownFailureSearchResult.setHasMoreResults(false);
        unknownFailureSearchResult.setErrorMessage("Unexpected error. Please check the log.");
        unknownFailureSearchResult.setTime(Instant.now());
        return unknownFailureSearchResult;
    }

    public void shortcutSearch(Long searchRequestId) {
        ActiveSearch activeSearch = activeSearches.get(searchRequestId);
        if (activeSearch == null) {
            logger.debug("Unable to shortcut search with ID {} because no search is running for it", searchRequestId);
            return;
        }
        activeSearch.shortcutRequested = true;
        synchronized (activeSearch.futures) {
            for (Future<IndexerSearchResult> future : activeSearch.futures) {
                future.cancel(true);
            }
        }
    }

    private Callable<IndexerSearchResult> getIndexerCallable(SearchRequest searchRequest, IndexerSearchCacheEntry indexerSearchCacheEntry) {
        int offset;
        if (indexerSearchCacheEntry.getIndexerSearchResults().isEmpty()) {
            offset = 0;
        } else {
            IndexerSearchResult indexerToSearch = Iterables.getLast(indexerSearchCacheEntry.getIndexerSearchResults());
            offset = indexerToSearch.getOffset() + indexerToSearch.getPageSize();
        }
        int limit = LOAD_LIMIT_API;
        return () -> indexerSearchCacheEntry.getIndexer().search(searchRequest, offset, limit);
    }

    @SuppressWarnings("unused")
    @PreDestroy
    public void onShutdown() {
        shutdownRequested = true;
        synchronized (executors) {
            if (!executors.isEmpty()) {
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

    public record SearchEvent(SearchRequest searchRequest) {
    }

    /**
     * State of one currently running search. Allows shortcutting a search between two indexer rounds.
     */
    protected static class ActiveSearch {

        private volatile boolean shortcutRequested = false;
        private final List<Future<IndexerSearchResult>> futures = Collections.synchronizedList(new ArrayList<>());

    }

    private record SubmittedSearch(IndexerSearchCacheEntry entry, Future<IndexerSearchResult> future) {
    }

    /**
     * Identifies a search request independently of its paging data and of the object's identity. The category is
     * compared by name on purpose: a config reload creates new Category instances which must still hit the cache.
     */
    private record SearchCacheKey(SearchSource source, SearchType searchType, String categoryName, Integer minsize,
                                  Integer maxsize, Integer minage, Integer maxage, String query,
                                  Map<MediaIdType, String> identifiers, String title, Integer season, String episode,
                                  String author) {

        private static SearchCacheKey of(SearchRequest searchRequest) {
            return new SearchCacheKey(
                searchRequest.getSource(),
                searchRequest.getSearchType(),
                searchRequest.getCategory() == null ? null : searchRequest.getCategory().getName(),
                searchRequest.getMinsize().orElse(null),
                searchRequest.getMaxsize().orElse(null),
                searchRequest.getMinage().orElse(null),
                searchRequest.getMaxage().orElse(null),
                searchRequest.getQuery().orElse(null),
                searchRequest.getIdentifiers() == null ? Map.of() : Collections.unmodifiableMap(new HashMap<>(searchRequest.getIdentifiers())),
                searchRequest.getTitle().orElse(null),
                searchRequest.getSeason().orElse(null),
                searchRequest.getEpisode().orElse(null),
                searchRequest.getAuthor().orElse(null)
            );
        }
    }

}
