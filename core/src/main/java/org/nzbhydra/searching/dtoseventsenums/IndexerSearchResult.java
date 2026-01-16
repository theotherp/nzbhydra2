

package org.nzbhydra.searching.dtoseventsenums;


import com.google.common.base.Objects;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@ReflectionMarker
public class IndexerSearchResult {

    private Indexer indexer;
    private boolean wasSuccessful = false;
    private String errorMessage;
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private Set<SearchResultEntity> searchResultEntities = new HashSet<>();
    private int totalResults;
    private int offset;
    private int pageSize;
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

    public List<SearchResultItem> getSearchResultItems() {
        return searchResultItems.stream().sorted(Comparator.comparingLong(x -> ((SearchResultItem) x).getBestDate().getEpochSecond()).reversed()).collect(Collectors.toList());
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
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
