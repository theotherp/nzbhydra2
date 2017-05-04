package org.nzbhydra.update.gtihubmapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Release {

    private String url;
    @JsonProperty("htmlUrl")
    private String htmlUrl;
    @JsonProperty("assetsUrl")
    private String assetsUrl;
    @JsonProperty("uploadUrl")
    private String uploadUrl;
    @JsonProperty("tarballUrl")
    private String tarballUrl;
    @JsonProperty("zipballUrl")
    private String zipballUrl;
    private Integer id;
    @JsonProperty("tagName")
    private String tagName;
    @JsonProperty("targetCommitish")
    private String targetCommitish;
    private String name;
    private String body;
    private Boolean draft;
    private Boolean prerelease;
    @JsonProperty("createdAt")
    private String createdAt;
    @JsonProperty("publishedAt")
    private String publishedAt;

    private List<Asset> assets = null;

}
