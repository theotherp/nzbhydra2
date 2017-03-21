package org.nzbhydra.web.searching;

import org.nzbhydra.web.searching.mapping.IndexerSearch;
import org.nzbhydra.web.searching.mapping.SearchResponse;
import org.nzbhydra.web.searching.mapping.SearchResult;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
public class Search {

    @RequestMapping(value = "/internalapi/search", produces = "application/json")
    public SearchResponse search() {
        SearchResponse response = new SearchResponse();
        response.setRejected(Collections.emptyList());

        IndexerSearch indexerSearch = new IndexerSearch();
        indexerSearch.setIndexer("indexer");
        response.setIndexersearches(Collections.singletonList(indexerSearch));

        SearchResult searchResult = new SearchResult();
        response.setResults(Collections.singletonList(searchResult));

        return response;
    }
}
