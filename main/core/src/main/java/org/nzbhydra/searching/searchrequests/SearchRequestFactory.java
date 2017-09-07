package org.nzbhydra.searching.searchrequests;

import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SearchRequestFactory {

    @Autowired
    private ConfigProvider configProvider;


    public SearchRequest getSearchRequest(SearchType searchType, SearchSource source, Category category, long searchRequestId, Integer offset, Integer limit) {
        SearchRequest searchRequest = new SearchRequest(source, searchType, offset, limit);
        searchRequest.setSource(source);
        searchRequest.setCategory(category);
        searchRequest.setSearchRequestId(searchRequestId);
        MDC.put("SEARCH", String.valueOf(searchRequestId));
        if (!searchRequest.getMaxage().isPresent() && configProvider.getBaseConfig().getSearching().getMaxAge().isPresent()) {
            searchRequest.setMaxage(configProvider.getBaseConfig().getSearching().getMaxAge().get());
        }

        return searchRequest;
    }

}
