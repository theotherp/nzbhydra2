package org.nzbhydra.searching;


import com.google.common.base.Objects;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
public class IndexerSearchResult {

    private Indexer indexer;
    private boolean wasSuccessful = false;
    private String errorMessage;
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private int totalResults;
    private int offset;
    private int limit;
    private boolean totalResultsKnown;
    private boolean hasMoreResults;
    private long responseTime;
    private Instant time;


    private Multiset<String> reasonsForRejection = HashMultiset.create();

    public IndexerSearchResult() {
    }


    public IndexerSearchResult(Indexer indexer, boolean wasSuccessful) {
        this.wasSuccessful = wasSuccessful;
        this.indexer = indexer;
        this.time = Instant.now();
    }

    public IndexerSearchResult(Indexer indexer, String errorMessage) {
        this.wasSuccessful = false;
        this.indexer = indexer;
        this.time = Instant.now();
        this.errorMessage = errorMessage;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }
        IndexerSearchResult that = (IndexerSearchResult) o;
        return Objects.equal(indexer, that.indexer) &&
                Objects.equal(time, that.time);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(super.hashCode(), indexer, time);
    }
}
