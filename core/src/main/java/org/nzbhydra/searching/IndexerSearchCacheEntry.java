package org.nzbhydra.searching;

import com.google.common.collect.Iterables;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@ReflectionMarker
public class IndexerSearchCacheEntry {

    private Indexer indexer;
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private IndexerSearchEntity indexerSearchEntity;
    private List<IndexerSearchResult> indexerSearchResults = new ArrayList<>();
    private int nextResultIndex = 0;
    /**
     * Number of {@link IndexerSearchResult}s that were already written to the database. Only the ones after that
     * index need to be persisted again.
     */
    private int persistedResultCount = 0;
    /**
     * Tracks items already consumed via {@link #pop()} so they are not served again
     * after the list is rebuilt and re-sorted in {@link #addIndexerSearchResult}.
     */
    private final Set<SearchResultItem> poppedItems = new HashSet<>();
    /**
     * Only set for searches with a minimum age.
     */
    private MinAgeOffsetSearch minAgeOffsetSearch;

    public IndexerSearchCacheEntry(Indexer indexer) {
        this.indexer = indexer;
    }

    public IndexerSearchCacheEntry(Indexer indexer, Integer minAgeDays) {
        this.indexer = indexer;
        if (minAgeDays != null && minAgeDays > 0) {
            minAgeOffsetSearch = new MinAgeOffsetSearch(indexer.getName(), minAgeDays);
        }
    }

    public boolean isLastSuccessful() {
        if (indexerSearchResults.isEmpty()) {
            return true;
        }
        return Iterables.getLast(indexerSearchResults).isWasSuccessful();
    }

    public List<IndexerSearchResult> getIndexerSearchResults() {
        return Collections.unmodifiableList(indexerSearchResults);
    }

    public void addIndexerSearchResult(IndexerSearchResult newIndexerSearchResult) {
        if (minAgeOffsetSearch != null && !minAgeOffsetSearch.pageLoaded(newIndexerSearchResult)) {
            //Results behind the first one old enough. They would be merged before the ones in between were loaded
            newIndexerSearchResult.setSearchResultItems(new ArrayList<>());
            newIndexerSearchResult.getReasonsForRejection().clear();
        }
        indexerSearchResults.add(newIndexerSearchResult);
        searchResultItems.clear();
        for (IndexerSearchResult indexerSearchResult : indexerSearchResults) {
            searchResultItems.addAll(indexerSearchResult.getSearchResultItems());
        }
        searchResultItems.sort(SearchResultItem.NEWEST_FIRST);

        // After rebuilding and re-sorting, remove items that were already consumed
        // by the merge-sort loop and reset the index so only genuinely new items
        // are available for popping.
        searchResultItems.removeAll(poppedItems);
        nextResultIndex = 0;
    }

    public List<SearchResultItem> getSearchResultItems() {
        return Collections.unmodifiableList(searchResultItems);
    }

    public boolean isMoreResultsInCache() {
        return searchResultItems.size() > nextResultIndex;
    }

    public SearchResultItem peek() {
        return searchResultItems.get(nextResultIndex);
    }

    public SearchResultItem pop() {
        SearchResultItem item = searchResultItems.get(nextResultIndex++);
        poppedItems.add(item);
        return item;
    }

    /**
     * Returns true if the item was already handed out by {@link #pop()}.
     */
    public boolean isPopped(SearchResultItem item) {
        return poppedItems.contains(item);
    }

    public boolean isMoreResultsAvailable() {
        if (indexerSearchResults.isEmpty()) {
            return true;
        }
        IndexerSearchResult lastResult = Iterables.getLast(indexerSearchResults);
        if (minAgeOffsetSearch != null) {
            return minAgeOffsetSearch.isMoreResultsAvailable(lastResult);
        }
        return lastResult.isHasMoreResults();
    }

    /**
     * @return whether this indexer is still looking for its first result old enough for a minimum age
     */
    public boolean isSearchingFirstOldEnough() {
        return minAgeOffsetSearch != null && minAgeOffsetSearch.isSearchingFirstOldEnough();
    }

    /**
     * @return the number of queries which were only made to find the first result old enough for a minimum age
     */
    public int getMinAgeProbes() {
        return minAgeOffsetSearch == null ? 0 : minAgeOffsetSearch.getProbes();
    }

    /**
     * @return the offset with which the indexer should be queried next
     */
    public int getNextOffset() {
        if (indexerSearchResults.isEmpty()) {
            return 0;
        }
        IndexerSearchResult lastResult = Iterables.getLast(indexerSearchResults);
        if (minAgeOffsetSearch != null) {
            return minAgeOffsetSearch.getNextOffset(lastResult);
        }
        return lastResult.getOffset() + lastResult.getPageSize();
    }

    /**
     * @return true if the next query would use the same offset as the last one and therefore return the same results
     */
    public boolean isStalled() {
        return !indexerSearchResults.isEmpty() && getNextOffset() == Iterables.getLast(indexerSearchResults).getOffset();
    }

    public boolean isAllPulled() {
        if (searchResultItems.isEmpty()) {
            return true;
        }
        return searchResultItems.size() < nextResultIndex;
    }

}
