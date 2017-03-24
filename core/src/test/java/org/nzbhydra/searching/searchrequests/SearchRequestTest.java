package org.nzbhydra.searching.searchrequests;

import com.google.common.base.Objects;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import org.junit.Test;
import org.nzbhydra.searching.SearchType;

public class SearchRequestTest {
    private class SearchRequestCacheKey {

        private final SearchRequest searchRequest;

        public SearchRequestCacheKey(SearchRequest searchRequest) {
            this.searchRequest = searchRequest;
        }

        public SearchRequest getSearchRequest() {
            return searchRequest;
        }

        public boolean equals(Object obj) {
            if (obj == null) return false;
            if (getClass() != obj.getClass()) return false;

            final SearchRequestCacheKey other = (SearchRequestCacheKey) obj;
            return Objects.equal(searchRequest.getAuthor(), other.getSearchRequest().getAuthor())
                    && Objects.equal(searchRequest.getTitle(), other.getSearchRequest().getTitle())
                    && Objects.equal(searchRequest.getQuery(), other.getSearchRequest().getQuery())
                    && Objects.equal(searchRequest.getEpisode(), other.getSearchRequest().getEpisode())
                    && Objects.equal(searchRequest.getSeason(), other.getSearchRequest().getSeason())
                    && Objects.equal(searchRequest.getIdentifiers(), other.getSearchRequest().getIdentifiers())
                    && Objects.equal(searchRequest.getMinage(), other.getSearchRequest().getMinage())
                    && Objects.equal(searchRequest.getMaxage(), other.getSearchRequest().getMaxage())
                    && Objects.equal(searchRequest.getMinsize(), other.getSearchRequest().getMinsize())
                    && Objects.equal(searchRequest.getMaxsize(), other.getSearchRequest().getMaxsize())
                    ;
        }

        @Override
        public int hashCode() {
            return Objects.hashCode(searchRequest.getAuthor(), searchRequest.getTitle(), searchRequest.getQuery(), searchRequest.getEpisode(), searchRequest.getSeason(), searchRequest.getIdentifiers(), searchRequest.getMinage(), searchRequest.getMaxage(), searchRequest.getMinsize(), searchRequest.getMaxsize());
        }
    }

    @Test
    public void testCacheKey() throws Exception {
        LoadingCache<SearchRequestCacheKey, String> cache = CacheBuilder.newBuilder().build(new CacheLoader<SearchRequestCacheKey, String>() {
            @Override
            public String load(SearchRequestCacheKey key) throws Exception {
                System.out.println("Creating new");
                return "new one";
            }
        });

        SearchRequest a = new SearchRequest(SearchType.SEARCH, 0, 100);
        a.setQuery("query");
        SearchRequest b = new SearchRequest(SearchType.SEARCH, 0, 100);
        b.setQuery("query");
        SearchRequestCacheKey cacheKeyA = new SearchRequestCacheKey(a);
        SearchRequestCacheKey cacheKeyB = new SearchRequestCacheKey(b);
        cache.get(cacheKeyA);
        cache.get(cacheKeyB);
    }

}