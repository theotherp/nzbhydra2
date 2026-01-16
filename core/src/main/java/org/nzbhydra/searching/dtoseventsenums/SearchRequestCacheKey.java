

package org.nzbhydra.searching.dtoseventsenums;

import com.google.common.base.Objects;
import org.nzbhydra.searching.searchrequests.SearchRequest;

public class SearchRequestCacheKey {

    private final SearchRequest searchRequest;

    public SearchRequestCacheKey(SearchRequest searchRequest) {
        this.searchRequest = searchRequest;
    }

    public SearchRequest getSearchRequest() {
        return searchRequest;
    }

    public boolean equals(Object obj) {
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }

        final SearchRequestCacheKey other = (SearchRequestCacheKey) obj;
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
