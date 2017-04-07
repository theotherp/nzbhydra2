package org.nzbhydra.searching.searchrequests;

import org.nzbhydra.config.Category;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.stereotype.Component;

@Component
public class SearchRequestFactory {


    public SearchRequest getSearchRequest(SearchType searchType, SearchSource source, Category category, Integer offset, Integer limit) {
        SearchRequest searchRequest = new SearchRequest(source, searchType, offset, limit);
        searchRequest.setSource(source);
        searchRequest.setCategory(category);

        return searchRequest;
    }

}
