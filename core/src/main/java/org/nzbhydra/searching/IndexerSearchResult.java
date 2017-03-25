package org.nzbhydra.searching;


import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Data;
import org.nzbhydra.searching.searchmodules.Indexer;

import java.util.List;

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
    private long responseTime;

    private Multiset<String> reasonsForRejection = HashMultiset.create();

    public IndexerSearchResult() {
    }

    public IndexerSearchResult(Indexer indexer) {
        this.indexer = indexer;
        hasMoreResults = true;
    }

    public IndexerSearchResult(Indexer indexer, boolean wasSuccessful) {
        this.wasSuccessful = wasSuccessful;
        this.indexer = indexer;
    }
}
