/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.externaltools;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import joptsimple.internal.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import okhttp3.MediaType;
import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.Jackson;
import org.nzbhydra.api.ExternalApi;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.searchrequests.SearchSource;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.web.UrlCalculator;
import org.nzbhydra.webaccess.WebAccess;
import org.nzbhydra.webaccess.WebAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class ExternalTools {

    private static final TypeReference<List<Map>> LIST_TYPE_REFERENCE = new TypeReference<>() {
    };

    private enum BackendType {
        Newznab,
        Torznab
    }

    private static final Logger logger = LoggerFactory.getLogger(ExternalTools.class);

    @Autowired
    private WebAccess webAccess;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UrlCalculator urlCalculator;

    private final List<String> messages = new ArrayList<>();
    private final Map<IndexerConfig, Integer> indexerPrioritiesMapped = new HashMap<>();


    public boolean addNzbhydraAsIndexer(AddRequest addRequest) throws IOException {
        try {
            logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Received request: {}", addRequest);
            messages.clear();
            indexerPrioritiesMapped.clear();

            if (failOnUnknownVersion(addRequest)) {
                return false;
            }

            if (addRequest.isConfigureForUsenet()) {
                final boolean anyUsenetIndexerEnabled = configProvider.getBaseConfig().getIndexers().stream()
                    .filter(x -> SearchSource.API.meets(x.getEnabledForSearchSource()))
                        .filter(x -> x.getState() == IndexerConfig.State.ENABLED)
                        .anyMatch(x -> x.getSearchModuleType() != SearchModuleType.TORZNAB);
                if (!anyUsenetIndexerEnabled) {
                    messages.add("You selected to add NZBHydra as a usenet indexer but no usened indexers are enabled (for API access)");
                    return false;
                }
            }

            if (deleteIndexers(addRequest)) {
                return false;
            }

            logger.info("Enabling mocking mode for external tool configuration. Any search requests made now will return mocked resuls; no indexers will be searched");
            ExternalApi.setInMockingMode(true);

            logger.info("Received request to configure {} at URL {} with add type {} for usenet: {} and torrents: {}", addRequest.getExternalTool(), addRequest.getXdarrHost(), addRequest.getAddType(), addRequest.isConfigureForUsenet(), addRequest.isConfigureForTorrents());
            final List<IndexerConfig> availableIndexers = configProvider.getBaseConfig().getIndexers().stream()
                .filter(x -> (x.getState() == IndexerConfig.State.ENABLED || addRequest.isAddDisabledIndexers()) && x.isConfigComplete() && x.isAllCapsChecked())
                .filter(x -> SearchSource.API.meets(x.getEnabledForSearchSource()))
                .toList();

            final Optional<Integer> maxPriority = availableIndexers.stream().map(IndexerConfig::getScore).max(Comparator.naturalOrder());
            if (addRequest.getAddType() == AddRequest.AddType.PER_INDEXER && addRequest.isUseHydraPriorities() && maxPriority.isPresent() && maxPriority.get() > 51) {
                logger.info("Detected indexer with a priority higher than 51 which cannot not supported by {}. Will try to adapt priorities", addRequest.getExternalTool());
                float ratio = 50F / (float) maxPriority.get(); //Example: maxPriority is 100 -> ratio is 0.5, every indexer priority is muliplied with 0.5.
                availableIndexers.forEach(indexerConfig -> {
                    //Invert values (1 is highest priority in *arr, 50 the lowest) also needs to be done
                    int arrPriority = (int) (50 - indexerConfig.getScore() * ratio);
                    arrPriority = Math.max(arrPriority, 1); //0 is not allwed
                    logger.debug("Calculated *arr priority for {} to be {}. NZBHydra priority: {}", indexerConfig.getName(), arrPriority, indexerConfig.getScore());
                    indexerPrioritiesMapped.put(indexerConfig, arrPriority);
                });
            }

            if (addRequest.isConfigureForUsenet()) {
                if (addRequest.getAddType() == AddRequest.AddType.SINGLE) {
                    executeConfigurationRequest(addRequest, BackendType.Newznab, null);
                } else {
                    final List<IndexerConfig> availableTorznabIndexers = availableIndexers.stream().filter(x -> x.getSearchModuleType() != SearchModuleType.TORZNAB).toList();
                    for (IndexerConfig indexer : availableTorznabIndexers) {
                        executeConfigurationRequest(addRequest, BackendType.Newznab, indexer);
                    }
                }
            }
            if (addRequest.isConfigureForTorrents()) {
                if (addRequest.getAddType() == AddRequest.AddType.SINGLE) {
                    executeConfigurationRequest(addRequest, BackendType.Torznab, null);
                } else {
                    final List<IndexerConfig> availableUsenetIndexers = availableIndexers.stream().filter(x -> x.getSearchModuleType() == SearchModuleType.TORZNAB).toList();
                    for (IndexerConfig indexer : availableUsenetIndexers) {
                        executeConfigurationRequest(addRequest, BackendType.Torznab, indexer);
                    }
                }
            }

            messages.add("Configuration of " + addRequest.getExternalTool() + " finished successfully");
            return true;
        } catch (Exception e) {
            messages.add("Unexpected error: " + e.getMessage());
            logger.error("Unexpected error during configuration of " + addRequest.getExternalTool().name(), e);
            return false;
        } finally {
            logger.info("Disabling mocking mode");
            ExternalApi.setInMockingMode(false);
        }
    }

    private boolean deleteIndexers(AddRequest addRequest) throws IOException {
        final List<XdarrIndexer> configuredNzbhydraIndexers;
        try {
            configuredNzbhydraIndexers = getConfiguredNzbhydraIndexers(addRequest);
        } catch (WebAccessException e) {
            handleXdarrError(addRequest, e);
            return true;
        }
        logger.info("Found {} configured NZBHydra indexer entries", configuredNzbhydraIndexers.size());
        for (XdarrIndexer indexer : configuredNzbhydraIndexers) {
            logger.debug("Deleting indexer entry {}", indexer.getName());
            try {
                webAccess.deleteToUrl(getExternalToolUrl(addRequest) + "/indexer/" + indexer.getId(), getAuthHeaders(addRequest), 10);
            } catch (WebAccessException e) {
                handleXdarrError(addRequest, e);
            }
            messages.add("Deleted existing entry \"" + indexer.getName() + "\"");
        }
        if (addRequest.getAddType() == AddRequest.AddType.DELETE_ONLY) {
            if (configuredNzbhydraIndexers.isEmpty()) {
                messages.add("No NZBHydra entries found");
            }
        }
        if (addRequest.getAddType() == AddRequest.AddType.DELETE_ONLY) {
            return true;
        }
        return false;
    }

    private boolean failOnUnknownVersion(AddRequest addRequest) throws IOException {
        final String body;
        try {
            final String url = getExternalToolUrl(addRequest) + "/system/status";
            body = webAccess.callUrl(url, getAuthHeaders(addRequest));
            logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Received response body: {}", body);
        } catch (WebAccessException e) {
            if (e.getCode() == 404) {
                messages.add("Error: API endpoint not found. Make sure URL is correct and you used the correct version");
                throw new IOException("Error: API endpoint not found. Make sure URL is correct and you used the correct version");
            }
            handleXdarrError(addRequest, e);
            return true;
        }
        final Map statusMap = Jackson.JSON_MAPPER.readValue(body, Map.class);
        if (!statusMap.containsKey("version")) {
            messages.add("Error: no version found in external tool response");
            throw new IOException("Error: no version found in external tool response");
        }
        String version = (String) statusMap.get("version");
        if (addRequest.getExternalTool() == AddRequest.ExternalTool.Sonarrv3) {
            if (version == null || (!version.startsWith("3") && !version.startsWith("4"))) {
                messages.add("Error: configuration for v3 but returned version is " + version);
                throw new IOException("Error: configuration for v3 but returned version is " + version);
            }
        } else if (addRequest.getExternalTool() == AddRequest.ExternalTool.Radarrv3) {
            //For some reason some radarr v3 builds return 10.xxx instead of 3.xxx
            if (version == null || (!version.startsWith("3") && !version.startsWith("4") && !version.startsWith("10"))) {
                messages.add("Error: configuration for v3 but returned version is " + version);
                throw new IOException("Error: configuration for v3 but returned version is " + version);
            }
        } else if (addRequest.getExternalTool() == AddRequest.ExternalTool.Sonarr || addRequest.getExternalTool() == AddRequest.ExternalTool.Radarr) {
            if (version == null || version.startsWith("3")) {
                messages.add("Error: configuration for v2 but returned version is " + version);
                throw new IOException("Error: configuration for v2 but returned version is " + version);
            }
        }
        return false;
    }

    public List<String> getMessages() {
        return messages;
    }

    private void executeConfigurationRequest(AddRequest addRequest, BackendType backendType, IndexerConfig indexer) throws IOException {
        XdarrIndexer xdarrAddRequest = new XdarrIndexer();
        final AddRequest.ExternalTool externalTool = addRequest.getExternalTool();
        xdarrAddRequest.setConfigContract(backendType == BackendType.Newznab ? "NewznabSettings" : "TorznabSettings");
        //Only for sonarr and lidarr
        xdarrAddRequest.setEnableAutomaticSearch(addRequest.isEnableAutomaticSearch());
        //For Radarr
        if (externalTool == AddRequest.ExternalTool.Radarr) {
            xdarrAddRequest.setEnableSearch(addRequest.isEnableAutomaticSearch());
        }
        xdarrAddRequest.setEnableInteractiveSearch(addRequest.isEnableInteractiveSearch());
        xdarrAddRequest.setEnableRss(addRequest.isEnableRss());
        xdarrAddRequest.setImplementation(backendType == BackendType.Newznab ? "Newznab" : "Torznab");
        xdarrAddRequest.setImplementationName(backendType == BackendType.Newznab ? "Newznab" : "Torznab");
        xdarrAddRequest.setInfoLink("https://wiki.servarr.com/Sonarr_Supported_Indexers");
        String nameInXdarr = addRequest.getNzbhydraName();
        if (addRequest.getAddType() == AddRequest.AddType.SINGLE && addRequest.isConfigureForTorrents() && addRequest.isConfigureForUsenet()) {
            nameInXdarr += " (" + backendType.name() + ")";
        } else if (indexer != null) {
            nameInXdarr += " (" + indexer.getName() + ")";
        }
        xdarrAddRequest.setName(nameInXdarr);
        xdarrAddRequest.setProtocol(backendType == BackendType.Newznab ? "usenet" : "torrent");
        xdarrAddRequest.setSupportsRss(true);
        xdarrAddRequest.setSupportsSearch(true);

        xdarrAddRequest.getFields().add(new XdarrAddRequestField("apiKey", configProvider.getBaseConfig().getMain().getApiKey()));
        xdarrAddRequest.getFields().add(new XdarrAddRequestField("categories", mapCategories(addRequest.getCategories(), addRequest)));
        xdarrAddRequest.getFields().add(new XdarrAddRequestField("additionalParameters", getAdditionalParameters(addRequest, indexer == null ? null : indexer.getName())));

        if (externalTool == AddRequest.ExternalTool.Sonarrv3) {
            //V3 requires an empty list if no categories are supplied
            xdarrAddRequest.getFields().add(new XdarrAddRequestField("animeCategories", addRequest.getAnimeCategories() == null ? Collections.emptyList() : addRequest.getAnimeCategories()));
            xdarrAddRequest.setDownloadClientId(0);
            xdarrAddRequest.getFields().add(new XdarrAddRequestField("animeStandardFormatSearch", false));
        } else if (externalTool != AddRequest.ExternalTool.Lidarr && externalTool != AddRequest.ExternalTool.Radarrv3) {
            new XdarrAddRequestField("animeCategories", mapCategories(addRequest.getCategories(), addRequest));
        }
        if (externalTool == AddRequest.ExternalTool.Lidarr || externalTool == AddRequest.ExternalTool.Readarr) {
            xdarrAddRequest.getFields().add(new XdarrAddRequestField("earlyReleaseLimit", addRequest.getEarlyDownloadLimit()));
        }

        if (backendType == BackendType.Torznab) {
            if (externalTool == AddRequest.ExternalTool.Sonarrv3 || externalTool == AddRequest.ExternalTool.Lidarr || externalTool == AddRequest.ExternalTool.Radarrv3 || externalTool == AddRequest.ExternalTool.Readarr) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("seedCriteria.seedRatio", addRequest.getSeedRatio()));
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("seedCriteria.seedTime", addRequest.getSeedTime()));
            }
            if (externalTool == AddRequest.ExternalTool.Sonarr) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("SeedCriteria.SeedRatio", addRequest.getSeedRatio()));
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("SeedCriteria.SeedTime", addRequest.getSeedTime()));
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("SeedCriteria.SeasonPackSeedTime", addRequest.getSeasonPackSeedTime()));
            }
            if (externalTool == AddRequest.ExternalTool.Sonarrv3) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("seedCriteria.seasonPackSeedTime", addRequest.getSeasonPackSeedTime()));
            }
            if (externalTool == AddRequest.ExternalTool.Lidarr || externalTool == AddRequest.ExternalTool.Readarr) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("seedCriteria.discographySeedTime", addRequest.getDiscographySeedTime()));
            }

            xdarrAddRequest.getFields().add(new XdarrAddRequestField("baseUrl", addRequest.getNzbhydraHost() + "/torznab"));
            if (externalTool.isV3()) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("minimumSeeders", addRequest.getMinimumSeeders() != null ? Integer.parseInt(addRequest.getMinimumSeeders()) : 1));
            } else {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("minimumSeeders", addRequest.getMinimumSeeders() != null ? addRequest.getMinimumSeeders() : "1"));
            }
        } else {
            xdarrAddRequest.getFields().add(new XdarrAddRequestField("baseUrl", addRequest.getNzbhydraHost()));
        }

        if (externalTool.isV3()) {
            if (addRequest.getAddType() == AddRequest.AddType.SINGLE && addRequest.getPriority() != null) {
                xdarrAddRequest.setPriority(addRequest.getPriority());
            } else if (addRequest.isUseHydraPriorities()) {
                if (!indexerPrioritiesMapped.isEmpty()) {
                    xdarrAddRequest.setPriority(indexerPrioritiesMapped.get(indexer));
                } else {
                    int arrPriority = 50 - indexer.getScore();
                    arrPriority = Math.max(arrPriority, 1); //0 is "disabled"
                    logger.debug("Calculated *arr priority for {} to be {}. NZBHydra priority: {}", indexer.getName(), arrPriority, indexer.getScore());
                    xdarrAddRequest.setPriority(arrPriority);
                }
            } //else: Set value 0 (no priority)
        }

        if (externalTool.isRadarr()) {
            xdarrAddRequest.getFields().add(new XdarrAddRequestField("removeYear", addRequest.isRemoveYearFromSearchString()));
            //Not easily mapped as it's a list of numbers mapped to language names
            if (externalTool == AddRequest.ExternalTool.Radarrv3) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("multiLanguages", Collections.emptyList()));
            } else {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("multiLanguages", ""));
            }
            if (externalTool == AddRequest.ExternalTool.Radarr) {
                xdarrAddRequest.getFields().add(new XdarrAddRequestField("SearchByTitle", false));
            }

            //todo make configurable via dialog
            if (backendType == BackendType.Torznab) {
                if (externalTool.isV3()) {
                    xdarrAddRequest.getFields().add(new XdarrAddRequestField("requiredFlags", Collections.emptyList()));
                } else {
                    xdarrAddRequest.getFields().add(new XdarrAddRequestField("requiredFlags", ""));
                }
            }

        }

        if (externalTool != AddRequest.ExternalTool.Radarr) {
            xdarrAddRequest.getFields().add(new XdarrAddRequestField("apiPath", "/api"));
        }

        if (externalTool.isV2()) {
            //non-v3 versions require that all field keys / names start with an uppercase letter
            xdarrAddRequest.getFields().forEach(x -> {
                x.setName(StringUtils.capitalize(x.getName()));
            });
        }

        final String body;
        try {
            body = Jackson.JSON_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(xdarrAddRequest);
            logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Built request body: {}", body);
        } catch (JsonProcessingException e) {
            logger.error("Unable to write request", e);
            throw new IOException("Unable to write request", e);
        }
        final String response;
        try {
            final String url = getExternalToolUrl(addRequest) + "/indexer";
            logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Calling URL {} with data\n{} and body\n{}", url, xdarrAddRequest, body);

            response = webAccess.postToUrl(url, MediaType.get("application/json"), body, getAuthHeaders(addRequest), 10);
            logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Received response body: {}", response);
            if (response == null) {
                throw new WebAccessException("No response available from tool");
            } else if (response.startsWith("[")) {
                throw new WebAccessException("If you configured " + addRequest.getExternalTool().name() + " to use an URL base make sure to add it in the URL.");
            }
            final Map requestResponse = Jackson.JSON_MAPPER.readValue(response, Map.class);
            messages.add("Configured \"" + nameInXdarr + "\"");
        } catch (WebAccessException e) {
            handleXdarrError(addRequest, e);
        }
    }

    private Object mapCategories(String categoriesString, AddRequest addRequest) {
        if (Strings.isNullOrEmpty(categoriesString)) {
            if (addRequest.getExternalTool().isV3()) {
                return Collections.emptyList();
            } else {
                return "";
            }
        } else {
            if (addRequest.getExternalTool().isV3() || addRequest.getExternalTool() == AddRequest.ExternalTool.Readarr || addRequest.getExternalTool() == AddRequest.ExternalTool.Lidarr) {
                return Stream.of(addRequest.getCategories().split(",")).map(Integer::parseInt).collect(Collectors.toList());
            } else {
                return Arrays.asList(addRequest.getCategories().split(","));
            }
        }
    }

    private List<XdarrIndexer> getConfiguredNzbhydraIndexers(AddRequest addRequest) throws IOException {
        final String response;
        final String url = getExternalToolUrl(addRequest) + "/indexer";
        logger.debug("Getting configured indexers using URL {}", url);

        response = webAccess.callUrl(url, getAuthHeaders(addRequest));
        logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Received response body: {}", response);

        final List<XdarrIndexer> requestResponse = Jackson.JSON_MAPPER.readValue(response, new TypeReference<>() {
        });

        final List<XdarrIndexer> nzbhydraIndexers = requestResponse.stream().filter(x -> x.getName().contains(addRequest.getNzbhydraName())).collect(Collectors.toList());
        return nzbhydraIndexers;
    }

    private void handleXdarrError(AddRequest addRequest, WebAccessException e) throws IOException {
        logger.debug(LoggingMarkers.EXTERNAL_TOOLS, "Received error response: {}", e.getBody());

        if (e.getBody() != null && e.getBody().trim().startsWith("[")) {
            final List<Map> requestResponse = Jackson.JSON_MAPPER.readValue(e.getBody(), LIST_TYPE_REFERENCE);
            if (requestResponse.size() > 0 && requestResponse.get(0).containsKey("errorMessage")) {
                final String errorMessage = (String) requestResponse.get(0).get("errorMessage");
                messages.add("Error: " + errorMessage);
                throw new IOException(addRequest.getExternalTool().name() + " returned error message: " + errorMessage);
            }
        } else if (e.getBody() != null && e.getBody().trim().startsWith("{")) {
            String errorMessage = (String) Jackson.JSON_MAPPER.readValue(e.getBody(), Map.class).get("error");
            if (Strings.isNullOrEmpty(errorMessage)) {
                errorMessage = (String) Jackson.JSON_MAPPER.readValue(e.getBody(), Map.class).get("message");
            }
            messages.add("Error: " + errorMessage);
            throw new IOException(addRequest.getExternalTool().name() + " returned error message: " + errorMessage);
        } else {
            messages.add(e.getMessage());
            throw e;
        }
    }

    private HashMap<String, String> getAuthHeaders(AddRequest addRequest) {
        final HashMap<String, String> headers = new HashMap<>();
        if (addRequest.getXdarrApiKey() != null) {
            headers.put("X-Api-Key", addRequest.getXdarrApiKey());
        }
        return headers;
    }

    private String getExternalToolUrl(AddRequest addRequest) {
        final String url;
        if (addRequest.getExternalTool() == AddRequest.ExternalTool.Sonarrv3 || addRequest.getExternalTool() == AddRequest.ExternalTool.Radarrv3) {
            url = addRequest.getXdarrHost() + "/api/v3";
        } else if (addRequest.getExternalTool() == AddRequest.ExternalTool.Lidarr || addRequest.getExternalTool() == AddRequest.ExternalTool.Readarr) {
            url = addRequest.getXdarrHost() + "/api/v1";
        } else {
            url = addRequest.getXdarrHost() + "/api";
        }
        return url;
    }

    private String getAdditionalParameters(AddRequest addRequest, String indexerName) {
        String parametersString = addRequest.getAdditionalParameters();
        final Map<String, String> parameterMap = parseParameters(parametersString);
        //Remove if originally defined
        parameterMap.remove("indexers");
        if (indexerName != null) {
            parameterMap.put("indexers", org.apache.catalina.util.URLEncoder.QUERY.encode(indexerName, StandardCharsets.UTF_8));
        }
        return parameterMap.isEmpty() ? null : ("&" + parameterMap.entrySet().stream().map(x -> x.getKey() + "=" + x.getValue()).collect(Collectors.joining("&")));
    }

    private Map<String, String> parseParameters(String parametersString) {
        if (parametersString == null) {
            return new HashMap<>();
        }

        final Set<String> parameters = Stream.of(parametersString.split("&")).filter(x -> !Strings.isNullOrEmpty(x)).collect(Collectors.toSet());
        final Map<String, String> parameterMap = new HashMap<>();
        parameters.forEach(x -> {
            final String[] split = x.split("=");
            parameterMap.put(split[0], split[1]);
        });
        return parameterMap;
    }

    @Data
@ReflectionMarker
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class XdarrIndexer {

        public int downloadClientId = 0;
        public Boolean enableRss;
        public Boolean enableAutomaticSearch;
        public Boolean enableInteractiveSearch;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public Boolean enableSearch;
        public Boolean supportsRss;
        public Boolean supportsSearch;
        public String protocol;
        public String name;
        public List<XdarrAddRequestField> fields = new ArrayList<>();
        public String implementationName;
        public String implementation;
        public String configContract;
        public String infoLink;
        public List<Object> tags = new ArrayList<>();
        public int id;
        public int priority;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class XdarrAddRequestField {
        private String name;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private Object value;
    }

    @Data
@ReflectionMarker
    public static class XdarrAddRequestResponse {
        private boolean isWarning;
        private String propertyName;
        private String errorMessage;
        private String severity;
    }

}
