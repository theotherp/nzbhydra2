package org.nzbhydra.searching;


import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class IndexerSearchResult {

    private boolean wasSuccessful;
    private List<SearchResultItem> searchResultItems;
    private int totalResults;
    private boolean totalResultsKnown;
    private boolean hasMoreResults;
    private Map<String, Integer> rejectionReasonsCount;

    public IndexerSearchResult() {

    }

    public IndexerSearchResult(boolean wasSuccessful) {
        this.wasSuccessful = wasSuccessful;
    }
}
