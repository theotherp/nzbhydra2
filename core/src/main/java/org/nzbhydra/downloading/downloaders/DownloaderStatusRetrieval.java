

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

    // The problem logged at error level by the last call, null if it succeeded. The status is polled every few seconds,
    // so the same problem is logged at error level only once and its repeats at debug level. A problem is identified
    // by the message plus the exception's class and message, so a different error is logged at error level again.
    private String lastProblem;

    public DownloaderStatus getStatus() {
        Collection<Downloader> allDownloaders = downloaderProvider.getAllDownloaders();
        List<Downloader> enabledDownloaders = allDownloaders.stream()
            .filter(Downloader::isEnabled)
            .toList();
        if (enabledDownloaders.isEmpty()) {
            clearProblem();
            return new DownloaderStatus();
        }
        final Optional<Downloader> downloader = enabledDownloaders.stream()
                .filter(x -> enabledDownloaders.size() == 1 || x.getName().equals(configProvider.getBaseConfig().getDownloading().getPrimaryDownloader()))
                .findFirst();

        if (downloader.isEmpty()) {
            logProblem("Unable to determine to choose downloader for which to retrieve status.", null);
            return new DownloaderStatus();
        }
        DownloaderStatus status;
        try {
            status = downloader.get().getStatus();
            status.setUrl(configProvider.getBaseConfig().getDownloading().getExternalUrl().orElse(downloader.get().getUrl()));
            clearProblem();
        } catch (Exception e) {
            logProblem("Error while retrieving downloader status", e);
            status = DownloaderStatus.builder().state(DownloaderStatus.State.OFFLINE).build();
        }
        return status;
    }

    private synchronized void logProblem(String message, Exception e) {
        final String problem = problemKey(message, e);
        if (problem.equals(lastProblem)) {
            logger.debug(message, e);
        } else {
            logger.error(message, e);
            lastProblem = problem;
        }
    }

    private static String problemKey(String message, Exception e) {
        if (e == null) {
            return message;
        }
        return message + "|" + e.getClass().getName() + "|" + e.getMessage();
    }

    private synchronized void clearProblem() {
        lastProblem = null;
    }
}
