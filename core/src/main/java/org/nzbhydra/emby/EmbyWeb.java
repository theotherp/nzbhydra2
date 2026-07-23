

package org.nzbhydra.emby;

import org.jetbrains.annotations.NotNull;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.mapping.emby.EmbyItemsResponse;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.core.type.TypeReference;

import java.io.IOException;

@RestController
public class EmbyWeb {

    private static final Logger logger = LoggerFactory.getLogger(EmbyWeb.class);

    @Autowired
    private WebAccess webAccess;
    @Autowired
    private ConfigProvider configProvider;

    @Secured({"ROLE_USER"})
    @GetMapping(value = "/internalapi/emby/isSeriesAvailable", produces = MediaType.APPLICATION_JSON_VALUE)
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
    @GetMapping(value = "/internalapi/emby/isMovieAvailable", produces = MediaType.APPLICATION_JSON_VALUE)
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
        return UriComponentsBuilder.fromUriString(configProvider.getBaseConfig().getEmby().getEmbyBaseUrl())
                .pathSegment("emby", "Items")
                .queryParam("Recursive", "true")
                .queryParam("api_key", configProvider.getBaseConfig().getEmby().getEmbyApiKey());
    }

}
