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

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class DownloadStatusUpdateTask {


    private static final long HOUR = 1000 * 60 * 60;

    @Autowired
    private DownloaderProvider downloaderProvider;
    @Autowired
    private NzbDownloadRepository downloadRepository;

    @Scheduled(fixedDelay = HOUR, initialDelay = HOUR)
    @Transactional
    public void checkStatus() {
        List<NzbDownloadStatus> statuses = Arrays.asList(NzbDownloadStatus.NONE, NzbDownloadStatus.REQUESTED, NzbDownloadStatus.NZB_ADDED, NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
        List<NzbDownloadEntity> downloadsWaitingForUpdate = downloadRepository.findByStatusInAndSearchResultNotNullOrderByTimeDesc(statuses);
        List<NzbDownloadEntity> updatedDownloads = new ArrayList<>();
        for (Downloader downloader : downloaderProvider.getAllDownloaders()) {
            if (downloader.isEnabled()) {
                updatedDownloads.addAll(downloader.checkForStatusUpdates(downloadsWaitingForUpdate));
            }
        }
        downloadRepository.save(updatedDownloads);
    }
}
