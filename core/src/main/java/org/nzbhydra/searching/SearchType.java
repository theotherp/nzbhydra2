package org.nzbhydra.searching;

import org.nzbhydra.mapping.newznab.ActionAttribute;

public enum SearchType {

    BOOK,
    MOVIE,
    MUSIC,
    SEARCH,
    TVSEARCH;

    public boolean matches(ActionAttribute attribute) {
        return attribute.name().toLowerCase().equals(this.name().toLowerCase());
    }

}
