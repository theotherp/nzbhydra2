package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.DownloadingConfig;

import java.util.List;
import java.util.stream.Collectors;


@Getter
public class SafeDownloadingConfig {

    private String saveTorrentsTo;
    private List<SafeDownloaderConfig> downloaders;

    public SafeDownloadingConfig(DownloadingConfig downloadingConfig) {
        saveTorrentsTo = downloadingConfig.getSaveTorrentsTo();
        downloaders = downloadingConfig.getDownloaders().stream().map(SafeDownloaderConfig::new).collect(Collectors.toList());
    }


}
