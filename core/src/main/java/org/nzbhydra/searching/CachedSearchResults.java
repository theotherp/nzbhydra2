package org.nzbhydra.searching;

import com.google.common.base.Objects;
import lombok.Data;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class CachedSearchResults {

    private Instant lastAccessed;
    private SearchRequest searchRequest;
    private Map<Indexer, List<IndexerSearchResult>> indexerSearchProcessingDatas = new HashMap<>();

    public CachedSearchResults(SearchRequest searchRequest, List<Indexer> indexers) {
        this.searchRequest = searchRequest;
        lastAccessed = Instant.now();
        for (Indexer indexer : indexers) {
            ArrayList<IndexerSearchResult> list = new ArrayList<>();
            list.add(new IndexerSearchResult(indexer));
            indexerSearchProcessingDatas.put(indexer, list);
        }
    }

    public boolean equals(Object obj) {
        if (obj == null) return false;
        if (getClass() != obj.getClass()) return false;

        final CachedSearchResults other = (CachedSearchResults) obj;
        return
                Objects.equal(searchRequest.getQuery(), other.getSearchRequest().getQuery())
                        && Objects.equal(searchRequest.getSeason(), other.getSearchRequest().getSeason())
                        && Objects.equal(searchRequest.getEpisode(), other.getSearchRequest().getEpisode())
                        && Objects.equal(searchRequest.getIdentifierKey(), other.getSearchRequest().getIdentifierKey())
                        && Objects.equal(searchRequest.getIdentifierValue(), other.getSearchRequest().getIdentifierValue())
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
                searchRequest.getIdentifierKey(),
                searchRequest.getIdentifierValue(),
                searchRequest.getAuthor(),
                searchRequest.getTitle(),
                searchRequest.getMinage(),
                searchRequest.getMaxage(),
                searchRequest.getMinsize(),
                searchRequest.getMaxsize()
        );
    }


}
