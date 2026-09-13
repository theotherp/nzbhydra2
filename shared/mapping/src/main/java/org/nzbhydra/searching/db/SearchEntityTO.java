

package org.nzbhydra.searching.db;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;


@Data
@AllArgsConstructor
@NoArgsConstructor
@ReflectionMarker
public class SearchEntityTO {

    private int id;
    private SearchSource source;
    private SearchType searchType;
    private Instant time;
    private Set<IdentifierKeyValuePairTO> identifiers = new HashSet<>();
    private String categoryName;
    private String query;
    private Integer season;
    private String episode;
    private String title;
    private String author;
    private Integer minAge;
    private Integer maxAge;
    private Integer minSize;
    private Integer maxSize;
    private Set<String> selectedIndexers;
    private String username;
    private String ip;
    private String userAgent;


}
