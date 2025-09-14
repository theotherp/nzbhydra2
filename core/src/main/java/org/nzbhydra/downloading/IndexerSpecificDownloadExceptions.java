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
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class IndexerSpecificDownloadExceptions {

    private static final Logger logger = LoggerFactory.getLogger(IndexerSpecificDownloadExceptions.class);

    @Autowired
    private ConfigProvider configProvider;


    public FileDownloadAccessType getAccessTypeForIndexer(IndexerConfig indexerConfig, FileDownloadAccessType defaultType, SearchResultEntity searchResult) {
        if (defaultType == FileDownloadAccessType.REDIRECT) {
            return FileDownloadAccessType.REDIRECT;
        }
        final String host = indexerConfig.getHost().toLowerCase();
        boolean isSpecial = isSendLinkRequired(host, indexerConfig.getName());
        boolean isTorboxDownloader = indexerConfig.getSearchModuleType() == SearchModuleType.TORBOX;
        if (isSpecial) {
            if (isTorboxDownloader) {
                throw new RuntimeException("Unable to use torbox downloader for indexer " + indexerConfig.getName() + " because they require a direct download");
            }
            logger.debug("Using file download access type 'Redirect' for indexer {}", indexerConfig.getName());
            return FileDownloadAccessType.REDIRECT;
        }
        if (searchResult.getDownloadType() == DownloadType.TORBOX) {
            logger.debug("Using file download access type 'Proxy' for torbox");
            return FileDownloadAccessType.PROXY;
        }


        return defaultType;
    }

    private static boolean isSendLinkRequired(String host, String name) {
        if (host.contains("5080") && name.contains("Mock3")) {
            //For local dev
            return true;
        }
        return host.contains("omgwtf")
               || host.contains("nzbs.in")
               || host.contains("nzbfinder")
                ;
    }


}
