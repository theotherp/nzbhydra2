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
    private boolean enabled = true;
    private String iconCssClass = null;
    private String name;
    private NzbAccessType nzbAccessType = NzbAccessType.REDIRECT;
    private NzbAddingType nzbAddingType = NzbAddingType.SEND_LINK;
    private DownloaderType downloaderType;
    private String url;

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }
}
