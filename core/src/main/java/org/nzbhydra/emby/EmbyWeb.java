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

package org.nzbhydra.emby;

import com.fasterxml.jackson.core.type.TypeReference;
import org.jetbrains.annotations.NotNull;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.mapping.emby.EmbyItemsResponse;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@RestController
public class EmbyWeb {

    private static final Logger logger = LoggerFactory.getLogger(EmbyWeb.class);

    @Autowired
    private WebAccess webAccess;
    @Autowired
    private ConfigProvider configProvider;

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/emby/isSeriesAvailable", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public boolean isSeriesAvailable(@RequestParam String tvdbId) {
        final String uriString = getUriBuilder()
                .queryParam("IncludeItemTypes", "Series")
                .queryParam("AnyProviderIdEquals", "tvdb." + tvdbId).toUriString();
        try {
            final EmbyItemsResponse response = webAccess.callUrl(uriString, new TypeReference<>() {
            });
            return response.getTotalRecordCount() > 0;
        } catch (IOException e) {
            logger.error("Error calling Emby API", e);
            return false;
        }
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/emby/isMovieAvailable", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public boolean isMovieAvailable(@RequestParam String tmdbId) {
        final String uriString = getUriBuilder()
                .queryParam("IncludeItemTypes", "Movies")
                .queryParam("AnyProviderIdEquals", "tmdb." + tmdbId).toUriString();
        try {
            final EmbyItemsResponse response = webAccess.callUrl(uriString, new TypeReference<>() {
            });
            return response.getTotalRecordCount() > 0;
        } catch (IOException e) {
            logger.error("Error calling Emby API", e);
            return false;
        }
    }

    @NotNull
    private UriComponentsBuilder getUriBuilder() {
        return UriComponentsBuilder.fromHttpUrl(configProvider.getBaseConfig().getEmby().getEmbyBaseUrl())
                .pathSegment("emby", "Items")
                .queryParam("Recursive", "true")
                .queryParam("api_key", configProvider.getBaseConfig().getEmby().getEmbyApiKey());
    }

}
