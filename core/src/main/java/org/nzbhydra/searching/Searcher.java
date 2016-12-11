package org.nzbhydra.searching;

import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.database.SearchRepository;
import org.nzbhydra.searching.searchmodules.SearchModule;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Component
public class Searcher {

    private static final Logger logger = LoggerFactory.getLogger(Searcher.class);

    @Autowired
    private DuplicateDetector duplicateDetector;

    @Autowired
    private SearchModuleProvider searchModuleProvider;

    @Autowired
    private SearchRepository searchRepository;


    public SearchResult search(SearchRequest searchRequest) {
        SearchEntity searchEntity = new SearchEntity();
        searchEntity.setInternal(searchRequest.isInternal());
        searchEntity.setCategory(searchRequest.getCategory());
        searchEntity.setQuery(searchRequest.getQuery());
        searchEntity.setIdentifierKey(searchRequest.getIdentifierKey());
        searchEntity.setIdentifierValue(searchRequest.getIdentifierValue());
        searchEntity.setSeason(searchRequest.getSeason());
        searchEntity.setEpisode(searchRequest.getEpisode());
        searchEntity.setSearchType(searchRequest.getSearchType());
        searchEntity.setUsername("");//TODO
        searchEntity.setTitle(searchRequest.getTitle());
        searchEntity.setAuthor(searchRequest.getAuthor());
        searchRepository.save(searchEntity);

        List<IndexerSearchResult> indexerSearchResults = new ArrayList<>();

        ExecutorService executor = Executors.newFixedThreadPool(15); //TODO Adapt number of threads to indexers

        List<Callable<IndexerSearchResult>> callables = new ArrayList<>();
        for (SearchModule searchModule : searchModuleProvider.getIndexers()) {
            callables.add(() -> searchModule.search(searchRequest));
        }

        try {
            List<Future<IndexerSearchResult>> futures = executor.invokeAll(callables);
            for (Future<IndexerSearchResult> future : futures) {
                try {
                    indexerSearchResults.add(future.get());
                } catch (ExecutionException e) {
                    logger.error("Error while searching",e);
                    //TODO Handle error, searchInternal modules should always catch as much as possible, so this is probably a bug
                }
            }
        } catch (InterruptedException e) {
            logger.error("Error while searching", e);
            //TODO Don't think this will happen often, should return results if available
        }

        List<SearchResultItem> searchResultItems = indexerSearchResults.stream().flatMap(x -> x.getSearchResultItems().stream()).collect(Collectors.toList());
        duplicateDetector.detectDuplicates(searchResultItems);

        org.nzbhydra.searching.SearchResult searchResult = new org.nzbhydra.searching.SearchResult();
        //TODO Offset, total, rejected, etc
        searchResult.setSearchResultItems(searchResultItems);
        return searchResult;
    }

}
