package org.nzbhydra.searching;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SearchResultWebTO {

    private String age;
    private Boolean age_precise;
    private String category;
    private String date;
    private Integer comments;
    private String details_link;
    private String downloadType;
    private Long epoch;
    private Integer files;
    private Integer grabs;
    private Integer seeders;
    private Integer peers;
    private String hasNfo;
    private Integer hash;
    private String indexer;
    private String indexerguid;
    private Integer indexerscore;
    private String link;
    private String originalCategory;
    private String searchResultId;
    private Long size;
    private String title;

}
