package org.nzbhydra.web.mapping;

import lombok.Data;

@Data
public class TvSearchRequestParameters extends BasicSearchRequestParameters {

    private String title;
    private String tvrageId;
    private String tvdbId;
    private String tvmazeId;

}
