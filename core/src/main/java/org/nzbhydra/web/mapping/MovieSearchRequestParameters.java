package org.nzbhydra.web.mapping;

import lombok.Data;

@Data
public class MovieSearchRequestParameters extends BasicSearchRequestParameters {

    private String title;
    private String imdbId;
    private String tmdbId;

}
