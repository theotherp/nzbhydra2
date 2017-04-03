package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.DownloaderConfig;

@Data
public class SafeDownloaderConfig {

    public SafeDownloaderConfig(DownloaderConfig downloaderConfig) {
        this.defaultCategory = downloaderConfig.getDefaultCategory();
        this.downloadType = downloaderConfig.getDownloadType();
        this.enabled = downloaderConfig.isEnabled();
        this.iconCssClass = downloaderConfig.getIconCssClass();
        this.name = downloaderConfig.getName();
        this.type = downloaderConfig.getType();

    }


    private String defaultCategory;
    private String downloadType;
    private boolean enabled = true;
    private String iconCssClass;
    private String name;
    private String type;

}
