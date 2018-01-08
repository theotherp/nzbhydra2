/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

import org.nzbhydra.downloading.Downloader.StatusCheckType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class DownloadStatusUpdater {

    private static final long HOUR_SECONDS = 60 * 60;
    private static final long DAY_SECONDS = 24 * 60 * 60;
    private static final long TEN_SECONDS_MS = 1000 * 10;
    private static final long TEN_MINUTES_MS = 1000 * 60*10;


    @Autowired
    private DownloaderProvider downloaderProvider;
    @Autowired
    private NzbDownloadRepository downloadRepository;

    @Scheduled(fixedDelay = TEN_MINUTES_MS, initialDelay = TEN_MINUTES_MS)
    @Transactional
    public void checkHistoryStatus() {
        List<NzbDownloadStatus> statusesToCheck = Arrays.asList(NzbDownloadStatus.REQUESTED, NzbDownloadStatus.NZB_ADDED, NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
        checkStatus(statusesToCheck, DAY_SECONDS, StatusCheckType.HISTORY);
    }

    @Scheduled(fixedDelay = TEN_SECONDS_MS, initialDelay = TEN_SECONDS_MS)
    @Transactional
    public void checkQueueStatus() {
        List<NzbDownloadStatus> statusesToCheck = Arrays.asList( NzbDownloadStatus.REQUESTED);
        checkStatus(statusesToCheck, HOUR_SECONDS, StatusCheckType.QUEUE);
    }

    protected void checkStatus(List<NzbDownloadStatus> nzbDownloadStatuses, long daySeconds, StatusCheckType history) {
        List<NzbDownloadStatus> statuses = nzbDownloadStatuses;
        //TODO check query and add index if necessary
        List<NzbDownloadEntity> downloadsWaitingForUpdate = downloadRepository.findByStatusInAndSearchResultNotNullAndTimeAfterOrderByTimeDesc(statuses, Instant.now().minusSeconds(daySeconds));
        if (downloadsWaitingForUpdate.isEmpty()) {
            return;
        }
        List<NzbDownloadEntity> updatedDownloads = new ArrayList<>();
        for (Downloader downloader : downloaderProvider.getAllDownloaders()) {
            if (downloader.isEnabled()) {
                updatedDownloads.addAll(downloader.checkForStatusUpdates(downloadsWaitingForUpdate, history));
            }
        }
        downloadRepository.save(updatedDownloads);
    }



}
