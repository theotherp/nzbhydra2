package org.nzbhydra.searching;

import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.database.SearchRepository;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
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

    private final ConcurrentHashMap<Integer, CachedSearchResults> searchRequestCache = new ConcurrentHashMap<>();


    public SearchResult search(SearchRequest searchRequest) {
        CachedSearchResults cachedSearchResults = getCachedSearchResults(searchRequest);

        SearchResult searchResult = new SearchResult();
        int numberOfWantedResults = searchRequest.getOffset() + searchRequest.getLimit();
        List<IndexerSearchResult> indexerSearchResultsToSearch = getIndexerSearchResultsToSearch(cachedSearchResults);
        while (indexerSearchResultsToSearch.size() > 0 && searchResult.calculateNumberOfResults() < numberOfWantedResults) { //TODO load all

            List<IndexerSearchResult> indexerSearchResults = callSearchModules(searchRequest, indexerSearchResultsToSearch);

            for (IndexerSearchResult indexerSearchResult : indexerSearchResults) {
                cachedSearchResults.getIndexerSearchProcessingDatas().get(indexerSearchResult.getIndexer()).add(indexerSearchResult);
            }

            searchRequestCache.put(searchRequest.hashCode(), cachedSearchResults);

            List<SearchResultItem> searchResultItems = cachedSearchResults.getIndexerSearchProcessingDatas().values().stream().flatMap(Collection::stream).filter(IndexerSearchResult::isWasSuccessful).flatMap(x -> x.getSearchResultItems().stream()).collect(Collectors.toList());
            DuplicateDetector.DuplicateDetectionResult duplicateDetectionResult = duplicateDetector.detectDuplicates(searchResultItems);


            //TODO Offset, total, rejected, etc
            searchResult.setDuplicateDetectionResult(duplicateDetectionResult);
            indexerSearchResultsToSearch = getIndexerSearchResultsToSearch(cachedSearchResults);
        }

        return searchResult;
    }

    protected CachedSearchResults getCachedSearchResults(SearchRequest searchRequest) {
        CachedSearchResults cachedSearchResults;
        if (searchRequest.getOffset() == 0 || !searchRequestCache.containsKey(searchRequest.hashCode())) { //TODO Timeout
            //New search
            SearchEntity searchEntity = new SearchEntity();
            searchEntity.setInternal(searchRequest.isInternal());
            searchEntity.setCategory(searchRequest.getCategory());
            searchEntity.setQuery(searchRequest.getQuery());
            searchEntity.setIdentifierKey(searchRequest.getIdentifierKey());
            searchEntity.setIdentifierValue(searchRequest.getIdentifierValue());
            searchEntity.setSeason(searchRequest.getSeason());
            searchEntity.setEpisode(searchRequest.getEpisode());
            searchEntity.setSearchType(searchRequest.getSearchType());
            searchEntity.setUsername(null);//TODO
            searchEntity.setTitle(searchRequest.getTitle());
            searchEntity.setAuthor(searchRequest.getAuthor());
            searchRepository.save(searchEntity);

            //TODO pick indexers
            List<Indexer> indexersToCall = searchModuleProvider.getIndexers();
            cachedSearchResults = new CachedSearchResults(searchRequest, indexersToCall);
        } else {
            cachedSearchResults = searchRequestCache.get(searchRequest.hashCode());

        }
        return cachedSearchResults;
    }

    protected List<IndexerSearchResult> getIndexerSearchResultsToSearch(CachedSearchResults cachedSearchResults) {
        return cachedSearchResults.getIndexerSearchProcessingDatas().values().stream().map(x -> x.get(x.size() - 1)).filter(IndexerSearchResult::isHasMoreResults).collect(Collectors.toList());
    }

    protected List<IndexerSearchResult> callSearchModules(SearchRequest searchRequest, List<IndexerSearchResult> indexersToSearch) {
        List<IndexerSearchResult> indexerSearchResults = new ArrayList<>();

        ExecutorService executor = Executors.newFixedThreadPool(indexersToSearch.size());

        List<Callable<IndexerSearchResult>> callables = new ArrayList<>();
        //TODO Only search those where the last call was successful, which are enabled and have more results
        for (IndexerSearchResult indexerToSearch : indexersToSearch) {
            int offset = indexerToSearch.getOffset() + indexerToSearch.getLimit();
            int limit = indexerToSearch.getLimit();
            callables.add(() -> indexerToSearch.getIndexer().search(searchRequest, offset, limit));
        }

        try {
            List<Future<IndexerSearchResult>> futures = executor.invokeAll(callables);
            for (Future<IndexerSearchResult> future : futures) {
                try {
                    indexerSearchResults.add(future.get());
                } catch (ExecutionException e) {
                    logger.error("Error while searching", e);
                    //TODO Handle error, searchInternal modules should always catch as much as possible, so this is probably a bug
                    IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
                    indexerSearchResult.setWasSuccessful(false);
                    indexerSearchResult.setErrorMessage(e.getMessage());
                    indexerSearchResult.setHasMoreResults(false);
                    indexerSearchResult.setSearchResultItems(Collections.emptyList());
                }
            }
        } catch (InterruptedException e) {
            logger.error("Error while searching", e);
            //TODO Don't think this will happen often, should return results if available
        }
        return indexerSearchResults;
    }


}
