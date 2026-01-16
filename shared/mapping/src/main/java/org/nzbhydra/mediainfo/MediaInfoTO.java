

package org.nzbhydra.mediainfo;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class MediaInfoTO {
    private String imdbId;
    private String tmdbId;
    private String tvmazeId;
    private String tvrageId;
    private String tvdbId;
    private String title;
    private Integer year;
    private String posterUrl;

}
