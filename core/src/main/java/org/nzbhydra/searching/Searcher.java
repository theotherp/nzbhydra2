package org.nzbhydra.searching;

import com.google.common.collect.Iterables;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.database.IdentifierKeyValuePair;
import org.nzbhydra.database.IndexerSearchEntity;
import org.nzbhydra.database.IndexerSearchRepository;
import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.database.SearchRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.searching.IndexerPicker.PickingResult;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.stream.Collectors;

@Component
public class Searcher {

    private static final Logger logger = LoggerFactory.getLogger(Searcher.class);

    @Autowired
    protected DuplicateDetector duplicateDetector;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private IndexerPicker indexerPicker;

    /**
     * Maps a search request's hash to its cache entry
     */
    private final ConcurrentHashMap<Integer, SearchCacheEntry> searchRequestCache = new ConcurrentHashMap<>();

    public SearchResult search(SearchRequest searchRequest) {
        SearchCacheEntry searchCacheEntry = getSearchCacheEntry(searchRequest);

        SearchResult searchResult = new SearchResult();
        int numberOfWantedResults = searchRequest.getOffset().orElse(0) + searchRequest.getLimit().orElse(100); //TODO default for limit
        searchResult.setPickingResult(searchCacheEntry.getPickingResult());

        Map<Indexer, List<IndexerSearchResult>> indexersToSearchAndTheirResults = getIndexerSearchResultsToSearch(searchCacheEntry.getIndexerSearchResultsByIndexer());

        while (indexersToSearchAndTheirResults.size() > 0 && searchCacheEntry.getNumberOfFoundResults() < numberOfWantedResults) {
            logger.debug("Going to call {} indexer because {} of {} wanted results were loaded yet", indexersToSearchAndTheirResults.size(), searchCacheEntry.getNumberOfFoundResults(), numberOfWantedResults);

            indexersToSearchAndTheirResults = callSearchModules(searchRequest, indexersToSearchAndTheirResults);
            searchCacheEntry.getIndexerSearchResultsByIndexer().putAll(indexersToSearchAndTheirResults);
            searchRequestCache.put(searchRequest.hashCode(), searchCacheEntry);
            searchResult.getIndexerSearchResultMap().putAll(indexersToSearchAndTheirResults);

            //Use search result items from the cache which contains *all* search searchResults, not just the latest. That allows finding duplicates that were in different searches
            List<SearchResultItem> searchResultItems = searchCacheEntry.getIndexerSearchResultsByIndexer().values().stream().flatMap(Collection::stream).filter(IndexerSearchResult::isWasSuccessful).flatMap(x -> x.getSearchResultItems().stream()).collect(Collectors.toList());
            DuplicateDetectionResult duplicateDetectionResult = duplicateDetector.detectDuplicates(searchResultItems);

            createOrUpdateIndexerSearchEntity(searchCacheEntry, indexersToSearchAndTheirResults, duplicateDetectionResult);

            searchResult.setDuplicateDetectionResult(duplicateDetectionResult);
            indexersToSearchAndTheirResults = getIndexerSearchResultsToSearch(indexersToSearchAndTheirResults);
            //Set the rejection counts from all searches, this and previous
            searchResult.getReasonsForRejection().clear();
            indexersToSearchAndTheirResults.values().forEach(x -> x.forEach(y -> y.getReasonsForRejection().entrySet().forEach(z -> searchResult.getReasonsForRejection().add(z.getElement(), z.getCount()))));
            searchCacheEntry.setNumberOfFoundResults(searchResult.calculateNumberOfProcessedResults());
            searchCacheEntry.setLastSearchResult(searchResult);
        }

        return searchCacheEntry.getLastSearchResult();
    }


    public OffsetAndLimitCalculation calculateOffsetAndLimit(int offset, int limit, int searchResultsSize) {
        if (offset >= searchResultsSize - 1) {
            logger.info("Offset {} exceeds the number of available results {}; returning empty search result", offset, searchResultsSize);
            return new OffsetAndLimitCalculation(0, 0);
        }
        if (offset + limit > searchResultsSize) {
            logger.debug("Offset {} + limit {} exceeds the number of available results {}; returning all remaining results from cache", offset, limit, searchResultsSize);
            limit = searchResultsSize - offset;
        }

        return new OffsetAndLimitCalculation(offset, limit);
    }

    private void createOrUpdateIndexerSearchEntity(SearchCacheEntry searchCacheEntry, Map<Indexer, List<IndexerSearchResult>> indexersToSearchAndTheirResults, DuplicateDetectionResult duplicateDetectionResult) {
        for (IndexerSearchResult indexerSearchResult : indexersToSearchAndTheirResults.values().stream().flatMap(List::stream).collect(Collectors.toList())) {
            IndexerSearchEntity entity = indexerSearchRepository.findByIndexerEntityAndSearchEntity(indexerSearchResult.getIndexer().getIndexerEntity(), searchCacheEntry.getSearchEntity());
            if (entity == null) {
                entity = new IndexerSearchEntity();
                entity.setIndexerEntity(indexerSearchResult.getIndexer().getIndexerEntity());
                entity.setSearchEntity(searchCacheEntry.getSearchEntity());
                entity.setResultsCount(indexerSearchResult.getTotalResults());
                entity.setSuccessful(indexerSearchResult.isWasSuccessful());
            }
            entity.setProcessedResults(indexerSearchResult.getSearchResultItems().size());
            entity.setUniqueResults(duplicateDetectionResult.getUniqueResultsPerIndexer().count(indexerSearchResult.getIndexer()));
            indexerSearchRepository.save(entity);
        }
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
            searchEntity.setCategoryName(searchRequest.getCategory().getName());
            searchEntity.setQuery(searchRequest.getQuery().orElse(null));
            searchEntity.setIdentifiers(searchRequest.getIdentifiers().entrySet().stream().map(x -> new IdentifierKeyValuePair(x.getKey().name(), x.getValue())).collect(Collectors.toSet()));
            searchEntity.setSeason(searchRequest.getSeason().orElse(null));
            searchEntity.setEpisode(searchRequest.getEpisode().orElse(null));
            searchEntity.setSearchType(searchRequest.getSearchType());
            searchEntity.setUsernameOrIp(searchRequest.getInternalData().getUsernameOrIp());
            searchEntity.setTitle(searchRequest.getTitle().orElse(null));
            searchEntity.setAuthor(searchRequest.getAuthor().orElse(null));

            //Extend search request
            searchRequest.extractExcludedWordsFromQuery();

            searchRepository.save(searchEntity);

            PickingResult pickingResult = indexerPicker.pickIndexers(searchRequest);
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
            limit = 100; //TODO Set either global default or get from indexerName or implement possibility to keep this unset and let indexer implementation decide
        } else {
            IndexerSearchResult indexerToSearch = Iterables.getLast(entry.getValue());
            offset = indexerToSearch.getOffset() + indexerToSearch.getLimit();
            limit = indexerToSearch.getLimit();
        }
        return () -> entry.getKey().search(searchRequest, offset, limit);
    }


}
