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
import java.util.Comparator;
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
     * Tracks items already consumed via {@link #pop()} so they are not served again
     * after the list is rebuilt and re-sorted in {@link #addIndexerSearchResult}.
     */
    private final Set<SearchResultItem> poppedItems = new HashSet<>();

    public IndexerSearchCacheEntry(Indexer indexer) {
        this.indexer = indexer;
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
        indexerSearchResults.add(newIndexerSearchResult);
        searchResultItems.clear();
        for (IndexerSearchResult indexerSearchResult : indexerSearchResults) {
            searchResultItems.addAll(indexerSearchResult.getSearchResultItems());
        }
        searchResultItems.sort(Comparator.comparingLong(x -> {

            final SearchResultItem searchResultItem = (SearchResultItem) x;
            if (searchResultItem.getBestDate() == null) {
                return 0;
            }
            return searchResultItem.getBestDate().getEpochSecond();
        }).reversed());

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

    public boolean isMoreResultsAvailable() {
        if (indexerSearchResults.isEmpty()) {
            return true;
        }
        return Iterables.getLast(indexerSearchResults).isHasMoreResults();
    }

    public boolean isAllPulled() {
        if (searchResultItems.isEmpty()) {
            return true;
        }
        return searchResultItems.size() < nextResultIndex;
    }

}
