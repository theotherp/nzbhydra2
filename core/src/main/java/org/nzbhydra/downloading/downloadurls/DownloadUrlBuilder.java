/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloadurls;

import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.web.UrlCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class DownloadUrlBuilder {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private List<DownloadUrlBuilderStrategy> downloadUrlBuilderStrategies = new ArrayList<>();

    public String getDownloadLinkForSendingToDownloader(SearchResultEntity searchResult, boolean internal) {
        Optional<String> specialUrl = downloadUrlBuilderStrategies
                .stream().map(x -> x.getDownloadLinkForSendingToDownloader(searchResult, internal, searchResult.getDownloadType()))
                .filter(Optional::isPresent).map(Optional::get).findFirst();
        if (specialUrl.isPresent()) {
            return specialUrl.get();
        }
        UriComponentsBuilder builder;
        final Optional<String> externalUrl = configProvider.getBaseConfig().getDownloading().getExternalUrl();
        if (externalUrl.isPresent()) {
            log.debug(LoggingMarkers.URL_CALCULATION, "Using configured external URL: {}", externalUrl.get());
            builder = UriComponentsBuilder.fromHttpUrl(externalUrl.get());
        } else {
            builder = urlCalculator.getRequestBasedUriBuilder();
            log.debug(LoggingMarkers.URL_CALCULATION, "Using URL calculated from request: {}", builder.toUriString());
        }
        return getDownloadLink(searchResult.getId(), internal, searchResult.getDownloadType(), builder);
    }

    public String getDownloadLinkForResults(Long searchResultId, boolean internal, DownloadType downloadType) {
        UriComponentsBuilder builder = urlCalculator.getRequestBasedUriBuilder();
        log.debug(LoggingMarkers.URL_CALCULATION, "Using URL calculated from request: {}", builder.toUriString());
        return getDownloadLink(searchResultId, internal, downloadType, builder);
    }

    private String getDownloadLink(Long searchResultId, boolean internal, DownloadType downloadType, UriComponentsBuilder builder) {
        String getName = downloadType == DownloadType.NZB ? "getnzb" : "gettorrent";
        if (internal) {
            builder.path("/" + getName + "/user");
            builder.path("/" + searchResultId);
        } else {
            MainConfig main = configProvider.getBaseConfig().getMain();
            builder.path("/" + getName + "/api");
            builder.path("/" + searchResultId);
            builder.queryParam("apikey", main.getApiKey());
        }
        return builder.toUriString();
    }
}
