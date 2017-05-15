
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "accessType",
        "categories",
        "downloadLimit",
        "enabled",
        "hitLimit",
        "host",
        "name",
        "password",
        "preselect",
        "score",
        "searchTypes",
        "search_ids",
        "showOnSearch",
        "timeout",
        "type",
        "username",
        "loadLimitOnRandom",
        "generalMinSize",
        "animeCategory",
        "apikey",
        "audiobookCategory",
        "backend",
        "comicCategory",
        "ebookCategory",
        "hitLimitResetTime",
        "magazineCategory",
        "generate_queries",
        "userAgent"
})
@Data
public class Indexer {

    @JsonProperty("accessType")
    public String accessType;
    @JsonProperty("categories")
    public List<String> categories = new ArrayList<>();
    @JsonProperty("downloadLimit")
    public Integer downloadLimit;
    @JsonProperty("enabled")
    public boolean enabled;
    @JsonProperty("hitLimit")
    public Integer hitLimit;
    @JsonProperty("host")
    public String host;
    @JsonProperty("name")
    public String name;
    @JsonProperty("password")
    public String password;
    @JsonProperty("preselect")
    public boolean preselect;
    @JsonProperty("score")
    public int score;
    @JsonProperty("searchTypes")
    public List<String> searchTypes = new ArrayList<>();
    @JsonProperty("search_ids")
    public List<String> searchIds = new ArrayList<>();
    @JsonProperty("showOnSearch")
    public boolean showOnSearch;
    @JsonProperty("timeout")
    public Integer timeout;
    @JsonProperty("type")
    public String type;
    @JsonProperty("username")
    public String username;
    @JsonProperty("loadLimitOnRandom")
    public Integer loadLimitOnRandom;
    @JsonProperty("generalMinSize")
    public int generalMinSize;
    @JsonProperty("animeCategory")
    public String animeCategory;
    @JsonProperty("apikey")
    public String apikey;
    @JsonProperty("audiobookCategory")
    public String audiobookCategory;
    @JsonProperty("backend")
    public String backend;
    @JsonProperty("comicCategory")
    public String comicCategory;
    @JsonProperty("ebookCategory")
    public String ebookCategory;
    @JsonProperty("hitLimitResetTime")
    public int hitLimitResetTime;
    @JsonProperty("magazineCategory")
    public String magazineCategory;
    @JsonProperty("generate_queries")
    public boolean generateQueries;
    @JsonProperty("userAgent")
    public String userAgent;

}
