package org.nzbhydra.mapping.newznab;

public enum ActionAttribute {

    SEARCH,
    TVSEARCH,
    MOVIE,
    BOOK,
    AUDIO,
    CAPS,
    GET,
    DETAILS,
    GETNFO,
    STATS;

    public boolean isSearch() {
        return this.equals(SEARCH) || this.equals(TVSEARCH) || this.equals(MOVIE) || this.equals(BOOK) || this.equals(AUDIO);
    }


}
