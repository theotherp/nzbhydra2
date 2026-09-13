

package org.nzbhydra.searching.dtoseventsenums;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ReflectionMarker
@Builder
public class SearchResultWebTO {

    private String age;
    private Boolean age_precise;
    private String category;
    private String categorySubtype;
    private String categorySearchType;
    private String cover;
    private String date;
    private Integer comments;
    private String comments_link;
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
    private String poster;
    private String searchResultId;
    private String downloadId;
    private String source;
    private Long size;
    private String title;
    private String season;
    private String episode;
    private String showtitle;
    private String downloadedAt;
    private String torrentDownloadFactor;
    private Integer qualityRating;
    private List<String> qualityWarnings;

}
