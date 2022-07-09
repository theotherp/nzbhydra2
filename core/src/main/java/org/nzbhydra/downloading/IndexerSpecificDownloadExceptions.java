/*
 *  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
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

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class IndexerSpecificDownloadExceptions {

    private static final Logger logger = LoggerFactory.getLogger(IndexerSpecificDownloadExceptions.class);

    @Autowired
    private ConfigProvider configProvider;

    public NzbAddingType getAddingTypeForIndexer(IndexerConfig indexerConfig, DownloaderConfig downloaderConfig) {
        final NzbAddingType defaultType = downloaderConfig.getNzbAddingType();
        if (defaultType == NzbAddingType.SEND_LINK) {
            return defaultType;
        }
        final String host = indexerConfig.getHost().toLowerCase();
        if (host.contains("omgwtf") || host.contains("nzbs.in")) {
            logger.debug("Using nzb adding type type 'Send link' for indexer {}", indexerConfig.getName());
            return NzbAddingType.SEND_LINK;
        }
        return defaultType;
    }

    public FileDownloadAccessType getAccessTypeForIndexer(IndexerConfig indexerConfig, FileDownloadAccessType defaultType) {
        if (defaultType == FileDownloadAccessType.REDIRECT) {
            return FileDownloadAccessType.REDIRECT;
        }
        final String host = indexerConfig.getHost().toLowerCase();
        if (host.contains("omgwtf") || host.contains("nzbs.in")) {
            logger.debug("Using file download access type 'Redirect' for indexer {}", indexerConfig.getName());
            return FileDownloadAccessType.REDIRECT;
        }
        return defaultType;
    }


}
