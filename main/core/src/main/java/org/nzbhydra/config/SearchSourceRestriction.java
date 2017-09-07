package org.nzbhydra.config;

import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

public enum SearchSourceRestriction {
    INTERNAL,
    API,
    BOTH,
    NONE;

    public boolean meets(SearchSource searchSource) {
        return searchSource.name().equals(this.name()) || this == BOTH;
    }
}
