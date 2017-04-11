package org.nzbhydra.mockserver;

import com.google.common.base.MoreObjects;
import lombok.Data;

import java.util.List;

@Data
public class ApiCallParameters {

    private String apikey;

    private String t;

    private String q;

    private List<Integer> cat;

    private String rid;
    private String tvdbid;
    private String tvmazeId;
    private String imdbid;
    private String tmdbid;
    private Integer season;
    private Integer ep;
    private String author;
    private String title;

    private Integer offset = 0;
    private Integer limit = 100;
    private Integer maxage;

    private String id;

    private boolean raw;
    private String o;

    //Not (yet) supported
    private String genre;
    private List<String> attrs;
    private boolean extended;


    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("t", t)
                .add("q", q)
                .add("cat", cat)
                .add("imdbid", imdbid)
                .add("tmdbid", tmdbid)
                .add("rid", rid)
                .add("tvdbid", tvdbid)
                .add("tvmazeId", tvmazeId)
                .add("season", season)
                .add("ep", ep)
                .add("author", author)
                .add("title", title)
                .add("offset", offset)
                .add("limit", limit)
                .add("maxage", maxage)
                .add("id", id)
                .add("raw", raw)
                .add("o", o)
                .add("genre", genre)
                .add("attrs", attrs)
                .add("extended", extended)
                .omitNullValues()
                .toString();
    }
}
