package org.nzbhydra.config;

public enum SearchSourceRestriction {
    INTERNAL,
    API,
    ALL_BUT_RSS,
    ONLY_RSS,
    BOTH,
    NONE;

    public boolean isEnabled() {
        return this != NONE;
    }
}
