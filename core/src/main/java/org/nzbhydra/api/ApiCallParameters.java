package org.nzbhydra.api;

import lombok.Data;

import java.util.List;

@Data
public class ApiCallParameters {

    private String apikey;

    private ActionAttribute t;

    private String q;

    private List<Integer> cat;

    private String rid;
    private String imdbid;
    private String tvdbid;
    private Integer season;
    private Integer ep;
    private String author;
    private String title;

    private Integer offset = 0;
    private Integer limit = 100;
    private Integer maxage;

    private String id;

    private boolean raw;
    private OutputType o;

    //Not (yet) supported
    private String genre;
    private List<String> attrs;
    private boolean extended;
}
