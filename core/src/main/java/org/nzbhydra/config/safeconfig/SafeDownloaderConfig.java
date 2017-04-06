package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.DownloaderType;

@Data
public class SafeDownloaderConfig {

    private String defaultCategory;
    private String downloadType;
    private boolean enabled = true;
    private String iconCssClass;
    private String name;
    private DownloaderType downloaderType;

    public SafeDownloaderConfig(DownloaderConfig downloaderConfig) {
        this.defaultCategory = downloaderConfig.getDefaultCategory();
        this.downloadType = downloaderConfig.getDownloadType();
        this.enabled = downloaderConfig.isEnabled();
        this.iconCssClass = downloaderConfig.getIconCssClass();
        this.name = downloaderConfig.getName();
        this.downloaderType = downloaderConfig.getDownloaderType();
    }

    public String getDownloaderType() {
        return downloaderType.name();
    }
}
