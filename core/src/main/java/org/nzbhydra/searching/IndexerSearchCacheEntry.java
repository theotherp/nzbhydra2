

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
import java.util.List;

@Data
@ReflectionMarker
public class IndexerSearchCacheEntry {

    private Indexer indexer;
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private IndexerSearchEntity indexerSearchEntity;
    private List<IndexerSearchResult> indexerSearchResults = new ArrayList<>();
    private int nextResultIndex = 0;

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
        return searchResultItems.get(nextResultIndex++);
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
