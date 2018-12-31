package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.downloading.DownloaderConfig;

@Data
public class SafeDownloaderConfig {

    private String defaultCategory;
    private String downloadType;
    private boolean enabled = true;
    private String iconCssClass;
    private String name;
    private String downloaderType;

    public SafeDownloaderConfig(DownloaderConfig downloaderConfig) {
        this.defaultCategory = downloaderConfig.getDefaultCategory();
        this.downloadType = downloaderConfig.getDownloadType().name();
        this.enabled = downloaderConfig.isEnabled();
        this.iconCssClass = downloaderConfig.getIconCssClass();
        this.name = downloaderConfig.getName();
        this.downloaderType = downloaderConfig.getDownloaderType().name();
    }


}
