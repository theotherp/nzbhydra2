package org.nzbhydra.searching;

import com.google.common.base.Objects;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Iterables;
import com.google.common.collect.Multiset;
import lombok.Data;
import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class SearchCacheEntry {

    private Instant lastAccessed;
    private SearchRequest searchRequest;
    private Map<Indexer, List<IndexerSearchResult>> indexerSearchResultsByIndexer = new HashMap<>();
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private IndexerForSearchSelection pickingResult;
    private SearchEntity searchEntity;
    private Multiset<String> reasonsForRejection = HashMultiset.create();
    private Integer numberOfAvailableResults = null;

    public SearchCacheEntry(SearchRequest searchRequest, IndexerForSearchSelection pickingResult, SearchEntity searchEntity) {
        this.searchRequest = searchRequest;
        this.searchEntity = searchEntity;
        lastAccessed = Instant.now();
        for (Indexer indexer : pickingResult.getSelectedIndexers()) {
            indexerSearchResultsByIndexer.put(indexer, new ArrayList<>());
        }
        this.pickingResult = pickingResult;
    }

    public int getNumberOfRejectedResults() {
        return reasonsForRejection.entrySet().stream().mapToInt(Multiset.Entry::getCount).sum();
    }

    public int getNumberOfTotalAvailableResults() {
        if (numberOfAvailableResults == null) {
            numberOfAvailableResults = indexerSearchResultsByIndexer.values().stream().mapToInt(x -> Iterables.getLast(x).getTotalResults()).sum();
        }
        return numberOfAvailableResults;
    }

    public int getNumberOfFoundResults() {
        return indexerSearchResultsByIndexer.values().stream().mapToInt(x -> x.stream().mapToInt(y -> y.getSearchResultItems().size()).sum()).sum();
    }


    public boolean equals(Object obj) {
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }

        final SearchCacheEntry other = (SearchCacheEntry) obj;
        return
                Objects.equal(searchRequest.getQuery(), other.getSearchRequest().getQuery())
                        && Objects.equal(searchRequest.getSeason(), other.getSearchRequest().getSeason())
                        && Objects.equal(searchRequest.getEpisode(), other.getSearchRequest().getEpisode())
                        && Objects.equal(searchRequest.getIdentifiers(), other.getSearchRequest().getIdentifiers())
                        && Objects.equal(searchRequest.getAuthor(), other.getSearchRequest().getAuthor())
                        && Objects.equal(searchRequest.getTitle(), other.getSearchRequest().getTitle())
                        && Objects.equal(searchRequest.getMinage(), other.getSearchRequest().getMinage())
                        && Objects.equal(searchRequest.getMaxage(), other.getSearchRequest().getMaxage())
                        && Objects.equal(searchRequest.getMinsize(), other.getSearchRequest().getMinsize())
                        && Objects.equal(searchRequest.getMaxsize(), other.getSearchRequest().getMaxsize())
                ;
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(
                searchRequest.getQuery(),
                searchRequest.getSeason(),
                searchRequest.getEpisode(),
                searchRequest.getIdentifiers(),
                searchRequest.getAuthor(),
                searchRequest.getTitle(),
                searchRequest.getMinage(),
                searchRequest.getMaxage(),
                searchRequest.getMinsize(),
                searchRequest.getMaxsize()
        );
    }


}
