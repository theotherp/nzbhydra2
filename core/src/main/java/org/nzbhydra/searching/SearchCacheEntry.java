package org.nzbhydra.searching;

import com.google.common.base.Objects;
import lombok.Data;
import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerPicker.PickingResult;
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
    private PickingResult pickingResult;
    private SearchEntity searchEntity;

    public SearchCacheEntry(SearchRequest searchRequest, PickingResult pickingResult, SearchEntity searchEntity) {
        this.searchRequest = searchRequest;
        this.searchEntity = searchEntity;
        lastAccessed = Instant.now();
        for (Indexer indexer : pickingResult.getSelectedIndexers()) {
            indexerSearchResultsByIndexer.put(indexer, new ArrayList<>());
        }
        this.pickingResult = pickingResult;
    }


    public boolean equals(Object obj) {
        if (obj == null) return false;
        if (getClass() != obj.getClass()) return false;

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
