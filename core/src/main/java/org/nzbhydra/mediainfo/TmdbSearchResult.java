package org.nzbhydra.mediainfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
class TmdbSearchResult {

    private String tmdbId;
    private String imdbId;
    private String title;
    private String posterUrl;
    private Integer year;
}
