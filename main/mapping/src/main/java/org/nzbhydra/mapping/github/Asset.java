package org.nzbhydra.mapping.github;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Asset {

    private String url;
    @JsonProperty("browser_download_url")
    private String browserDownloadUrl;
    private Integer id;
    private String name;
    private String label;
    private String state;
    @JsonProperty("content_type")
    private String contentType;
    private Long size;
    @JsonProperty("download_count")
    private Long downloadCount;
    @JsonProperty("created_at")
    private String createdAt;
    @JsonProperty("updated_at")
    private String updatedAt;

}
