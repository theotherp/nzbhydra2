package org.nzbhydra.searching.infos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TmdbSearchResult {

    private String tmdbId;
    private String imdbId;
    private String title;
    private String posterUrl;
    private Integer year;
}
