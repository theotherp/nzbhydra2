package org.nzbhydra.searching;

import com.google.common.collect.Iterables;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.database.IdentifierKeyValuePair;
import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.database.SearchRepository;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.Map.Entry;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Component
public class Searcher {

    private static final Logger logger = LoggerFactory.getLogger(Searcher.class);

    @Autowired
    protected DuplicateDetector duplicateDetector;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private BaseConfig baseConfig;

    /**
     * Maps a search request's hash to its cache entry
     */
    private final ConcurrentHashMap<Integer, SearchCacheEntry> searchRequestCache = new ConcurrentHashMap<>();

    public SearchResult search(SearchRequest searchRequest) {
        SearchCacheEntry searchCacheEntry = getSearchCacheEntry(searchRequest);

        SearchResult searchResult = new SearchResult();
        int numberOfWantedResults = searchRequest.getOffset().orElse(0) + searchRequest.getLimit().orElse(100); //TODO default for limit

        Map<Indexer, List<IndexerSearchResult>> indexersToSearchAndTheirResults = getIndexerSearchResultsToSearch(searchCacheEntry.getIndexerSearchResultsByIndexer());
        while (indexersToSearchAndTheirResults.size() > 0 && searchResult.calculateNumberOfResults() < numberOfWantedResults) { //TODO load all

            indexersToSearchAndTheirResults = callSearchModules(searchRequest, indexersToSearchAndTheirResults);
            searchCacheEntry.getIndexerSearchResultsByIndexer().putAll(indexersToSearchAndTheirResults);
            searchRequestCache.put(searchRequest.hashCode(), searchCacheEntry);
            searchResult.getIndexerSearchResultMap().putAll(indexersToSearchAndTheirResults);

            //Use search result items from the cache which contains *all* search searchResults, not just the latest. That allows finding duplicates that were in different searches
            List<SearchResultItem> searchResultItems = searchCacheEntry.getIndexerSearchResultsByIndexer().values().stream().flatMap(Collection::stream).filter(IndexerSearchResult::isWasSuccessful).flatMap(x -> x.getSearchResultItems().stream()).collect(Collectors.toList());
            DuplicateDetectionResult duplicateDetectionResult = duplicateDetector.detectDuplicates(searchResultItems);

            searchResult.setDuplicateDetectionResult(duplicateDetectionResult);
            indexersToSearchAndTheirResults = getIndexerSearchResultsToSearch(indexersToSearchAndTheirResults);
        }

        return searchResult;
    }

    protected SearchCacheEntry getSearchCacheEntry(SearchRequest searchRequest) {
        SearchCacheEntry searchCacheEntry;

        //Remove entries older than 5 minutes
        Iterator<Map.Entry<Integer, SearchCacheEntry>> iterator = searchRequestCache.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<Integer, SearchCacheEntry> next = iterator.next();
            if (next.getValue().getLastAccessed().plus(5, ChronoUnit.MINUTES).isBefore(Instant.now())) {
                searchRequestCache.remove(next.getKey());
            }
        }

        if (searchRequest.getOffset().orElse(0) == 0 || !searchRequestCache.containsKey(searchRequest.hashCode())) {
            //New search
            SearchEntity searchEntity = new SearchEntity();
            searchEntity.setSource(searchRequest.getSource());
            searchEntity.setCategory(searchRequest.getCategory());
            searchEntity.setQuery(searchRequest.getQuery().orElse(null));
            searchEntity.setIdentifiers(searchRequest.getIdentifiers().entrySet().stream().map(x -> new IdentifierKeyValuePair(x.getKey().name(), x.getValue())).collect(Collectors.toList()));
            searchEntity.setSeason(searchRequest.getSeason().orElse(null));
            searchEntity.setEpisode(searchRequest.getEpisode().orElse(null));
            searchEntity.setSearchType(searchRequest.getSearchType());
            searchEntity.setUsername(null);//TODO
            searchEntity.setTitle(searchRequest.getTitle().orElse(null));
            searchEntity.setAuthor(searchRequest.getAuthor().orElse(null));

            //Extend search request
            searchRequest.extractExcludedWordsFromQuery();




            searchRepository.save(searchEntity);


            List<Indexer> indexersToCall = pickIndexers();
            searchCacheEntry = new SearchCacheEntry(searchRequest, indexersToCall);
        } else {
            searchCacheEntry = searchRequestCache.get(searchRequest.hashCode());
            searchCacheEntry.setLastAccessed(Instant.now());
            searchCacheEntry.setSearchRequest(searchRequest); //Update to latest to keep offset and limit updated
        }
        return searchCacheEntry;
    }

    private List<Indexer> pickIndexers() {
        //List<Indexer> availableIndexers = searchModuleProvider.getIndexers().stream().filter(x -> x.);


        return searchModuleProvider.getIndexers();
    }

    protected Map<Indexer, List<IndexerSearchResult>> getIndexerSearchResultsToSearch(Map<Indexer, List<IndexerSearchResult>> map) {
        //TODO Do all relevant checks again in case the state of the indexerName was changed in the background (use only basic checks, errors, disabled, etc)
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

        ExecutorService executor = Executors.newFixedThreadPool(indexersToSearch.size());

        List<Callable<IndexerSearchResult>> callables = getCallables(searchRequest, indexersToSearch);

        try {
            List<Future<IndexerSearchResult>> futures = executor.invokeAll(callables);
            for (Future<IndexerSearchResult> future : futures) {
                try {
                    List<IndexerSearchResult> previousIndexerSearchResults = indexerSearchResults.get(future.get().getIndexer());
                    previousIndexerSearchResults.add(future.get());
                    indexerSearchResults.put(future.get().getIndexer(), previousIndexerSearchResults);
                } catch (ExecutionException e) {
                    logger.error("Unexpected error while searching", e);
                }
            }
        } catch (InterruptedException e) {
            logger.error("Unexpected error while searching", e);
        }
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
            limit = 100; //TODO Set either global default or get from indexerName or implement possibility to keep this unset and let indexerName decide
        } else {
            IndexerSearchResult indexerToSearch = Iterables.getLast(entry.getValue());
            offset = indexerToSearch.getOffset() + indexerToSearch.getLimit();
            limit = indexerToSearch.getLimit();
        }
        return () -> entry.getKey().search(searchRequest, offset, limit);
    }


}
