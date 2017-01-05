package org.nzbhydra.searching;


import lombok.Data;
import org.nzbhydra.searching.searchmodules.Indexer;

import java.util.List;
import java.util.Map;

@Data
public class IndexerSearchResult {

    private Indexer indexer;
    private boolean wasSuccessful;
    private String errorMessage;
    private List<SearchResultItem> searchResultItems;
    private int totalResults;
    private int offset;
    private int limit;
    private boolean totalResultsKnown;
    private boolean hasMoreResults;

    private Map<String, Integer> rejectionReasonsCount;

    public IndexerSearchResult() {

    }

    public IndexerSearchResult(Indexer indexer) {
        this.indexer = indexer;
        hasMoreResults = true;
    }

    public IndexerSearchResult(boolean wasSuccessful) {
        this.wasSuccessful = wasSuccessful;
    }
}
