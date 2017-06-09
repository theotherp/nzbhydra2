package org.nzbhydra.searching;

import org.nzbhydra.mapping.newznab.ActionAttribute;

public enum SearchType {

    SEARCH,
    TVSEARCH,
    MOVIE,
    BOOK,
    MUSIC;

    public boolean matches(ActionAttribute attribute) {
        return attribute.name().toLowerCase().equals(this.name().toLowerCase());
    }

}
