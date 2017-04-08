package org.nzbhydra.gtihubmapping;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Asset {

    private String url;
    private String browserDownloadUrl;
    private Integer id;
    private String name;
    private String label;
    private String state;
    private String contentType;
    private Long size;
    private Long downloadCount;
    private String createdAt;
    private String updatedAt;

}
