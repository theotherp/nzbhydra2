package org.nzbhydra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "downloaders")
public class DownloaderConfig {


    private String apiKey;
    private String defaultCategory;
    /**
     * TODO NZB or torrent
     */
    private String downloadType;
    private boolean enabled;
    private String iconCssClass;
    private String name;
    private NzbAccessType nzbAccessType;
    private NzbAddingType nzbAddingType;
    private DownloaderType downloaderType;
    private String url;

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }
}
