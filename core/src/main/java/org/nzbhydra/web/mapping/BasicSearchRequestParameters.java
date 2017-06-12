package org.nzbhydra.web.mapping;

import lombok.Data;

import java.util.Set;

@Data
public class BasicSearchRequestParameters {

    protected String query;
    protected Integer offset;
    protected Integer limit;
    protected Integer minsize;
    protected Integer maxsize;
    protected Integer minage;
    protected Integer maxage;
    protected Boolean loadAll;
    protected String category;
    protected Set<String> indexers;

    private String title;
    private String imdbId;
    private String tmdbId;

    private String tvrageId;
    private String tvdbId;
    private String tvmazeId;

}
