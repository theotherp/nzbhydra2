/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading;

import com.google.common.base.Stopwatch;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.downloaders.Downloader;
import org.nzbhydra.downloading.downloaders.Downloader.StatusCheckType;
import org.nzbhydra.downloading.downloaders.DownloaderProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class DownloadStatusUpdater {

    private static final long HOUR_SECONDS = 60 * 60;
    private static final long DAY_SECONDS = 24 * 60 * 60;
    private static final long TEN_SECONDS_MS = 1000 * 10;
    private static final long TEN_MINUTES_MS = 1000 * 60 * 10;
    private static final int MIN_SECONDS_SINCE_LAST_DOWNLOAD_TO_CHECK_STATUSES = 6 * 60 * 60; //No download should last longer than 6 hours

    protected Instant lastDownload = Instant.now();
    protected boolean queueCheckEnabled = true;
    protected boolean historyCheckEnabled = true;

    protected static final Logger logger = LoggerFactory.getLogger(DownloadStatusUpdater.class);

    static {
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Will not check for download statuses if last download was more than {} minutes ago", (MIN_SECONDS_SINCE_LAST_DOWNLOAD_TO_CHECK_STATUSES / 60));
    }

    @Autowired
    protected DownloaderProvider downloaderProvider;
    @Autowired
    protected FileDownloadRepository downloadRepository;
    @Autowired
    private ConfigProvider configProvider;

    @HydraTask(configId = "downloadHistoryCheck", name = "Download history check", interval = TEN_MINUTES_MS)
    @Transactional
    public void checkHistoryStatus() {
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Running download history  check");
        if (!configProvider.getBaseConfig().getDownloading().isUpdateStatuses()) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Skipping history status update because it's disabled");
            return;
        }
        if (!configProvider.getBaseConfig().getMain().isKeepHistory()) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Skipping history status update because no history is kept");
            return;
        }
        List<FileDownloadStatus> statusesToCheck = Arrays.asList(FileDownloadStatus.REQUESTED, FileDownloadStatus.NZB_ADDED, FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            checkStatus(statusesToCheck, DAY_SECONDS, StatusCheckType.HISTORY);
        } finally {
            logger.debug(LoggingMarkers.PERFORMANCE, "Check of history took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        }
    }

    @HydraTask(configId = "downloadQueueCheck", name = "Download queue check", interval = TEN_SECONDS_MS)
    @Transactional
    public void checkQueueStatus() {
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Running download queue check");
        if (!configProvider.getBaseConfig().getDownloading().isUpdateStatuses()) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Skipping queue status update because it's disabled");
            return;
        }
        if (!configProvider.getBaseConfig().getMain().isKeepHistory()) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Skipping history status update because no history is kept");
            return;
        }
        List<FileDownloadStatus> statusesToCheck = Arrays.asList(FileDownloadStatus.REQUESTED);
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            checkStatus(statusesToCheck, HOUR_SECONDS, StatusCheckType.QUEUE);
        } finally {
            logger.debug(LoggingMarkers.PERFORMANCE, "Check of download queue took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        }
    }


    @EventListener
    public void onNzbDownloadEvent(FileDownloadEvent downloadEvent) {
        if (!configProvider.getBaseConfig().getMain().isKeepHistory()) {
            return;
        }
        lastDownload = Instant.now();
        queueCheckEnabled = true;
        historyCheckEnabled = true;
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Received download event. Will enable status updates for the next {} minutes", (MIN_SECONDS_SINCE_LAST_DOWNLOAD_TO_CHECK_STATUSES / 60));
    }

    protected void checkStatus(List<FileDownloadStatus> nzbDownloadStatuses, long maxAgeDownloadEntitiesInSeconds, StatusCheckType statusCheckType) {
        if ((!queueCheckEnabled && statusCheckType == StatusCheckType.QUEUE) || (!historyCheckEnabled && statusCheckType == StatusCheckType.HISTORY)) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Not executing {} status update because it's disabled", statusCheckType);
            return;
        }
        if (lastDownload.isBefore(Instant.now().minusSeconds(MIN_SECONDS_SINCE_LAST_DOWNLOAD_TO_CHECK_STATUSES))) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Not executing {} status update because last download was {}", statusCheckType, lastDownload);
            return;
        }
        List<FileDownloadEntity> downloadsWaitingForUpdate = downloadRepository.findByStatusInAndTimeAfterOrderByTimeDesc(nzbDownloadStatuses, Instant.now().minusSeconds(maxAgeDownloadEntitiesInSeconds));
        if (downloadsWaitingForUpdate.isEmpty()) {
            if (statusCheckType == StatusCheckType.QUEUE) {
                queueCheckEnabled = false;
            } else {
                historyCheckEnabled = false;
            }
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Returning and setting {} status update disabled because no current downloads are waiting for updates", statusCheckType);
            return;
        }
        List<FileDownloadEntity> updatedDownloads = new ArrayList<>();
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "{} downloads waiting for {} update", downloadsWaitingForUpdate.size(), statusCheckType);
        for (Downloader downloader : downloaderProvider.getAllDownloaders()) {
            if (downloader.isEnabled()) {
                updatedDownloads.addAll(downloader.checkForStatusUpdates(downloadsWaitingForUpdate, statusCheckType));
            }
        }
        downloadRepository.saveAll(updatedDownloads);
    }

}
