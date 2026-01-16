

package org.nzbhydra.searching.db;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;


@Data
@ReflectionMarker
@NoArgsConstructor
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
    private String username;
    private String ip;
    private String userAgent;


}
