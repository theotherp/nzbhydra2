/*
 *  (C) Copyright 2021 TheOtherP (theotherp@posteo.net)
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
            status.setUrl(downloader.get().getUrl());
        } catch (Exception e) {
            logger.error("Error while retrieving downloader status", e);
            status = DownloaderStatus.builder().state(DownloaderStatus.State.OFFLINE).build();
        }
        return status;
    }
}
