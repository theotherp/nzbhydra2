package org.nzbhydra.update.gtihubmapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Release {

    private String url;
    private String htmlUrl;
    private String assetsUrl;
    private String uploadUrl;
    private String tarballUrl;
    private String zipballUrl;
    private Integer id;
    private String tagName;
    private String targetCommitish;
    private String name;
    private String body;
    private Boolean draft;
    private Boolean prerelease;
    private String createdAt;
    private String publishedAt;

    private List<Asset> assets = null;

}
