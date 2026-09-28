

package org.nzbhydra.searching.dtoseventsenums;


import com.google.common.base.Objects;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@ReflectionMarker
public class IndexerSearchResult {

    public static final Duration SORT_ORDER_TOLERANCE = Duration.ofHours(1);

    private Indexer indexer;
    private boolean wasSuccessful = false;
    private String errorMessage;
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    /**
     * The entities of the results which were created for this search result (i.e. which were not in the database before).
     */
    private Set<SearchResultEntity> searchResultEntities = new HashSet<>();
    /**
     * Internal IDs of the results which were already in the database when this search result was persisted.
     */
    private Set<Long> existingSearchResultIds = new HashSet<>();
    private int totalResults;
    private int offset;
    private int pageSize;
    private boolean totalResultsKnown;
    private boolean hasMoreResults;
    private long responseTime;
    private Instant time;


    private Multiset<String> reasonsForRejection = HashMultiset.create();
    /**
     * Dates of the newest and oldest result of the page as returned by the indexer, i.e. before any results were
     * rejected. Null if no result had a date.
     */
    private Instant newestResultDate;
    private Instant oldestResultDate;
    /**
     * Whether the indexer returned the results of the page newest first.
     */
    private boolean sortedNewestFirst = true;

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

    /**
     * @return the internal IDs of all results of this search result, new and already known ones.
     */
    public Set<Long> getSearchResultIds() {
        Set<Long> ids = new HashSet<>(existingSearchResultIds);
        for (SearchResultEntity searchResultEntity : searchResultEntities) {
            ids.add(searchResultEntity.getId());
        }
        return ids;
    }

    /**
     * Remembers the dates of the page's results in the order the indexer returned them, before any were rejected.
     * Small deviations in the order are tolerated because indexers may sort by a slightly different date than the one
     * we use.
     */
    public void rememberResultDates(List<SearchResultItem> items) {
        newestResultDate = null;
        oldestResultDate = null;
        sortedNewestFirst = true;
        Instant previousDate = null;
        for (SearchResultItem item : items) {
            Instant date = item.getBestDate();
            if (date == null) {
                continue;
            }
            if (previousDate != null && date.isAfter(previousDate.plus(SORT_ORDER_TOLERANCE))) {
                sortedNewestFirst = false;
            }
            previousDate = date;
            if (newestResultDate == null || date.isAfter(newestResultDate)) {
                newestResultDate = date;
            }
            if (oldestResultDate == null || date.isBefore(oldestResultDate)) {
                oldestResultDate = date;
            }
        }
    }

    public List<SearchResultItem> getSearchResultItems() {
        return searchResultItems.stream().sorted(SearchResultItem.NEWEST_FIRST).collect(Collectors.toList());
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
