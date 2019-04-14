package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.downloading.DownloadingConfig;

import java.util.List;
import java.util.stream.Collectors;


@Getter
public class SafeDownloadingConfig {

    private String saveTorrentsTo;
    private boolean sendMagnetLinks;
    private List<SafeDownloaderConfig> downloaders;
    private boolean showDownloaderStatus;

    public SafeDownloadingConfig(DownloadingConfig downloadingConfig) {
        saveTorrentsTo = downloadingConfig.getSaveTorrentsTo().orElse(null);
        sendMagnetLinks = downloadingConfig.isSendMagnetLinks();
        showDownloaderStatus = downloadingConfig.isShowDownloaderStatus();
        downloaders = downloadingConfig.getDownloaders().stream().map(SafeDownloaderConfig::new).collect(Collectors.toList());
    }


}
