package org.nzbhydra.web.searching.mapping;

import lombok.Data;

@Data
public class SearchResult {
    private String age;
    private Integer ageDays;
    private String category;
    private String title;
    private Integer hash;
    private String indexer;
    private String indexerscore;
    private String link;
    private String searchResultId;
    private String size;
    private String downloadType;
    private Integer epoch;
    private String pubdate_utc;
    private Boolean age_precise;
    private String indexerguid;
    private Integer has_nfo;
    private String details_link;
    private Integer dbsearchid;
    private Integer comments;
    private Integer grabs;
    private Integer files;
}
