

package org.nzbhydra.downloading.downloaders;

import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Component
public class DownloaderStatusRetrieval {

    private static final Logger logger = LoggerFactory.getLogger(DownloaderStatusRetrieval.class);

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private DownloaderProvider downloaderProvider;

    public DownloaderStatus getStatus() {
        Collection<Downloader> allDownloaders = downloaderProvider.getAllDownloaders();
        List<Downloader> enabledDownloaders = allDownloaders.stream()
            .filter(Downloader::isEnabled)
            .toList();
        if (enabledDownloaders.isEmpty()) {
            return new DownloaderStatus();
        }
        final Optional<Downloader> downloader = enabledDownloaders.stream()
                .filter(x -> enabledDownloaders.size() == 1 || x.getName().equals(configProvider.getBaseConfig().getDownloading().getPrimaryDownloader()))
                .findFirst();

        if (downloader.isEmpty()) {
            logger.error("Unable to determine to choose downloader for which to retrieve status.");
            return new DownloaderStatus();
        }
        DownloaderStatus status;
        try {
            status = downloader.get().getStatus();
            status.setUrl(configProvider.getBaseConfig().getDownloading().getExternalUrl().orElse(downloader.get().getUrl()));
        } catch (Exception e) {
            logger.error("Error while retrieving downloader status", e);
            status = DownloaderStatus.builder().state(DownloaderStatus.State.OFFLINE).build();
        }
        return status;
    }
}
