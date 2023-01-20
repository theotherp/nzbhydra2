package org.nzbhydra.mediainfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
class TmdbSearchResult {

    private String tmdbId;
    private String imdbId;
    private String title;
    private String posterUrl;
    private Integer year;
}
