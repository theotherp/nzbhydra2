package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;

import java.util.List;
import java.util.stream.Collectors;


@Getter
public class SafeDownloadingConfig {

    private final String saveTorrentsTo;
    private final String saveNzbsTo;
    private final boolean sendMagnetLinks;
    private final List<SafeDownloaderConfig> downloaders;
    private final boolean showDownloaderStatus;
    private final String primaryDownloader;
    private final FileDownloadAccessType fileDownloadAccessType;

    public SafeDownloadingConfig(DownloadingConfig downloadingConfig) {
        saveTorrentsTo = downloadingConfig.getSaveTorrentsTo().orElse(null);
        saveNzbsTo = downloadingConfig.getSaveNzbsTo().orElse(null);
        sendMagnetLinks = downloadingConfig.isSendMagnetLinks();
        showDownloaderStatus = downloadingConfig.isShowDownloaderStatus();
        downloaders = downloadingConfig.getDownloaders().stream().map(SafeDownloaderConfig::new).collect(Collectors.toList());
        primaryDownloader = downloadingConfig.getPrimaryDownloader();
        fileDownloadAccessType = downloadingConfig.getNzbAccessType();
    }


}
