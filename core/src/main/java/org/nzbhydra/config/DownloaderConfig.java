package org.nzbhydra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "downloaders")
public class DownloaderConfig {

    private String apiKey;
    private String defaultCategory;
    private String downloadType;
    private boolean enabled = true;
    private String host;
    private String iconCssClass;
    private String name;
    private String nzbAccessType;
    private String nzbAddingType;
    private String password;
    private Integer port;
    private boolean ssl;
    private String type;
    private String url;
    private String username;

}
