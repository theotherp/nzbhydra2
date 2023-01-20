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

package org.nzbhydra.downloading.downloaders;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloaders.nzbget.NzbGet;
import org.nzbhydra.downloading.downloaders.sabnzbd.Sabnzbd;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.webaccess.Ssl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class DownloaderInstatiator {

    @Autowired
    protected FileHandler nzbHandler;
    @Autowired
    protected SearchResultRepository searchResultRepository;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;
    @Autowired
    private IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private Ssl ssl;

    public Downloader instantiate(DownloaderType downloaderType) {
        switch (downloaderType) {
            case NZBGET -> {
                return new NzbGet(nzbHandler, searchResultRepository, applicationEventPublisher, indexerSpecificDownloadExceptions, configProvider, ssl);
            }
            case SABNZBD -> {
                return new Sabnzbd(nzbHandler, searchResultRepository, applicationEventPublisher, indexerSpecificDownloadExceptions, configProvider, restTemplate, requestFactory);
            }
        }
        throw new RuntimeException("Unable to instantiate " + downloaderType);
    }
}
