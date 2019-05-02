package org.nzbhydra.config;

import org.nzbhydra.searching.searchrequests.SearchRequest;

public enum SearchSourceRestriction {
    INTERNAL,
    API,
    ALL_BUT_RSS,
    BOTH,
    NONE;

    public boolean meets(SearchRequest searchRequest) {
        if (this == ALL_BUT_RSS && searchRequest.getSource() == SearchRequest.SearchSource.API) {
            return searchRequest.getQuery().isPresent() || !searchRequest.getIdentifiers().isEmpty();
        }
        return searchRequest.getSource().name().equals(this.name()) || this == BOTH;
    }
}
