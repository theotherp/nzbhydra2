

package org.nzbhydra.searching.dtoseventsenums;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Set;

@Data
@ReflectionMarker
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequestParameters {
    protected String query;
    protected Integer offset;
    protected Integer limit;
    protected Integer minsize;
    protected Integer maxsize;
    protected Integer minage;
    protected Integer maxage;
    protected boolean loadAll;
    protected String category;
    protected String mode;
    protected Set<String> indexers;

    private String title;

    private String imdbId;
    private String tmdbId;

    private String tvrageId;
    private String tvdbId;
    private String tvmazeId;

    private Integer season;
    private String episode;

    private long searchRequestId; //Sent by the GUI to identify this search when getting updates for it

}
