package org.nzbhydra.searching.searchrequests;

import org.nzbhydra.config.Category;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

@Component
public class SearchRequestFactory {


    public SearchRequest getSearchRequest(SearchType searchType, SearchSource source, Category category, long searchRequestId, Integer offset, Integer limit) {
        SearchRequest searchRequest = new SearchRequest(source, searchType, offset, limit);
        searchRequest.setSource(source);
        searchRequest.setCategory(category);
        searchRequest.setSearchRequestId(searchRequestId);
        MDC.put("SEARCH", String.valueOf(searchRequestId));

        return searchRequest;
    }

}
