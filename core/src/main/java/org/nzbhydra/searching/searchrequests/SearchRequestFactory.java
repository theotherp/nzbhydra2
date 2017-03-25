package org.nzbhydra.searching.searchrequests;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.searching.SearchRestrictionType;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Objects;

@Component
public class SearchRequestFactory {

    @Autowired
    private BaseConfig baseConfig;

    public SearchRequest getSearchRequest(SearchType searchType, SearchSource source, Category category, Integer offset, Integer limit) {
        SearchRequest searchRequest = new SearchRequest(searchType, offset, limit);
        searchRequest.setSource(source);
        searchRequest.setCategory(category);
        if (baseConfig.getSearching().getApplyRestrictions() == SearchRestrictionType.BOTH || Objects.equals(baseConfig.getSearching().getApplyRestrictions().name(), source.name())) {
            searchRequest.getInternalData().getExcludedWords().addAll(Arrays.asList(baseConfig.getSearching().getForbiddenWords().split(",")));
        }
        //TODO restrictions by category


        return searchRequest;
    }

}
