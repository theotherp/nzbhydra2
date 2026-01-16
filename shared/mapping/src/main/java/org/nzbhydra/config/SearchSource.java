

package org.nzbhydra.config;

public enum SearchSource {
    INTERNAL,
    API;

    public boolean meets(SearchSourceRestriction searchSourceRestriction) {
        return this.name().equals(searchSourceRestriction.name())
            || searchSourceRestriction == SearchSourceRestriction.BOTH
            || searchSourceRestriction == SearchSourceRestriction.ALL_BUT_RSS
            || (searchSourceRestriction == SearchSourceRestriction.ONLY_RSS && this == SearchSource.API);
    }
}
