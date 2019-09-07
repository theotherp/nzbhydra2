package org.nzbhydra.config;

import org.nzbhydra.searching.searchrequests.SearchRequest;

public enum SearchSourceRestriction {
    INTERNAL,
    API,
    ALL_BUT_RSS,
    ONLY_RSS,
    BOTH,
    NONE;

    public boolean meets(SearchRequest searchRequest) {
        if (this == ALL_BUT_RSS && searchRequest.getSource() == SearchRequest.SearchSource.API) {
            return searchRequest.getQuery().isPresent() || !searchRequest.getIdentifiers().isEmpty();
        }
        if (this == ONLY_RSS && searchRequest.getSource() == SearchRequest.SearchSource.API) {
            return !searchRequest.getQuery().isPresent() && searchRequest.getIdentifiers().isEmpty();
        }
        return meets(searchRequest.getSource());
    }

    public boolean meets(SearchRequest.SearchSource searchSource) {
        return searchSource.name().equals(this.name()) || this == BOTH || this == ALL_BUT_RSS || (this == ONLY_RSS && searchSource == SearchRequest.SearchSource.API);
    }
}
