package org.nzbhydra.web.searching.mapping;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SearchResult {

    private String age;
    private Boolean age_precise;
    private String category;
    private Integer comments;
    private String details_link;
    private String downloadType;
    private Long epoch;
    private Integer files;
    private Integer grabs;
    private Integer has_nfo;
    private Integer hash;
    private String indexer;
    private String indexerguid;
    private Integer indexerscore;
    private String link;
    private String pubdate_utc;
    private Integer searchResultId;
    private Long size;
    private String title;

}
