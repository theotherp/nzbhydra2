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

package org.nzbhydra.searching;

import com.google.common.base.Joiner;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.jetbrains.annotations.Nullable;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.searching.AffectedValue;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@Component
@RestController
public class CustomQueryAndTitleMappingHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomQueryAndTitleMappingHandler.class);

    @Autowired
    private ConfigProvider configProvider;


    public CustomQueryAndTitleMappingHandler() {
    }

    public CustomQueryAndTitleMappingHandler(BaseConfig baseConfig) {
        this.configProvider = new ConfigProvider() {
            @Override
            public BaseConfig getBaseConfig() {
                return baseConfig;
            }
        };
    }

    public SearchRequest mapSearchRequest(SearchRequest searchRequest) {
        return mapSearchRequest(searchRequest, configProvider.getBaseConfig().getSearching().getCustomMappings());
    }

    public SearchRequest mapSearchRequest(SearchRequest searchRequest, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        if (customQueryAndTitleMappings.isEmpty() || customQueryAndTitleMappings.stream().allMatch(x -> x.getAffectedValue() == AffectedValue.RESULT_TITLE)) {
            return searchRequest;
        }
        final MetaData metaData = mapMetaData(MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMappings);

        metaData.getQuery().ifPresent(searchRequest::setQuery);
        metaData.getTitle().ifPresent(searchRequest::setTitle);
        return searchRequest;
    }


    public SearchResultItem mapSearchResult(SearchResultItem searchResult, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        if (customQueryAndTitleMappings.isEmpty() || customQueryAndTitleMappings.stream().noneMatch(x -> x.getAffectedValue() == AffectedValue.RESULT_TITLE)) {
            return searchResult;
        }
        final MetaData metaData = mapMetaData(MetaData.fromSearchResult(searchResult), customQueryAndTitleMappings);

        metaData.getTitle().ifPresent(searchResult::setTitle);
        return searchResult;
    }

    public MetaData mapMetaData(MetaData metaData, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        if (metaData.getQuery().isPresent() && configProvider.getBaseConfig().getSearching().isReplaceUmlauts()) {
            final String oldQuery = metaData.getQuery().get();
            metaData.setQuery(oldQuery
                .replace("ä", "ae")
                .replace("Ä", "Ae")
                .replace("ö", "oe")
                .replace("Ö", "Oe")
                .replace("ü", "ue")
                .replace("Ü", "Ue")
                .replace("ß", "ss")
                    .replace("—", "-")
            );
            if (!oldQuery.equals(metaData.getQuery().get())) {
                logger.debug("Replaced umlauts. Old query: {}. New query: {}", oldQuery, metaData.getQuery().get());
            }

        }

        final List<CustomQueryAndTitleMapping> relevantMappings = customQueryAndTitleMappings.stream()
                .filter(x -> metaData.getSearchType() == x.getSearchType() || metaData.type == MetaData.Type.RESULT_TITLE)
                .filter(customQueryAndTitleMapping -> isDatasetMatch(metaData, customQueryAndTitleMapping))
                .filter(customQueryAndTitleMapping -> {
                    if (customQueryAndTitleMapping.getTo().contains("{season:") && metaData.getSeason().isEmpty()) {
                        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use customQueryAndTitleMapping {} because no season information is available for {}", customQueryAndTitleMapping, metaData);
                        return false;
                    }
                    if (customQueryAndTitleMapping.getTo().contains("{episode:") && metaData.getEpisode().isEmpty()) {
                        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use customQueryAndTitleMapping {} because no episode information is available for {}", customQueryAndTitleMapping, metaData);
                        return false;
                    }
                    return true;
                })
                .toList();

        if (relevantMappings.isEmpty()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "No mappings found matching: {}", metaData);
            return metaData;
        }
        if (relevantMappings.stream().filter(CustomQueryAndTitleMapping::isMatchAll).count() > 1) {
            logger.error("Unable to map search request ({}) because multiple customQueryAndTitleMappings which match the whole string match it:\n{}", metaData, Joiner.on("\n").join(customQueryAndTitleMappings));
            return metaData;
        }
        for (CustomQueryAndTitleMapping mapping : relevantMappings) {
            mapMetaData(metaData, mapping);
        }

        return metaData;
    }

    @SuppressWarnings("OptionalGetWithoutIsPresent")
    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/customMapping/test", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public TestResponse testMapping(@RequestBody TestRequest testRequest) {
        MetaData metaData = new MetaData();
        final String exampleInput = testRequest.exampleInput;
        if (!(testRequest.mapping.getFromPattern().matcher(exampleInput).matches() && testRequest.mapping.isMatchAll()) && !(testRequest.mapping.getFromPattern().matcher(exampleInput).find() && !testRequest.mapping.isMatchAll())) {
            return new TestResponse(null, null, false);
        }
        //For the test it doesn't matter which is affected
        testRequest.getMapping().setAffectedValue(AffectedValue.QUERY);
        metaData.setQuery(exampleInput);
        metaData.setSearchType(testRequest.mapping.getSearchType());
        metaData.setSeason(1);
        metaData.setEpisode(2);
        try {
            mapMetaData(metaData, testRequest.mapping);
            return new TestResponse(metaData.getQuery().get(), null, true);
        } catch (Exception e) {
            return new TestResponse(null, e.getMessage(), false);
        }
    }


    protected void mapMetaData(MetaData metaData, CustomQueryAndTitleMapping customQueryAndTitleMapping) {
        //What should happen: q=Boku no Hero Academia S4, season=4, ep=21 -> Boku no Hero Academia s04e21
        //What the user should enter roughly: {0:(my hero academia|Boku no Hero Academia) {ignore:.*} -> {0} s{season:00} e{episode:00}
        //How it's configured: "TVSEARCH;QUERY;{0:(my hero academia|Boku no Hero Academia) {ignore:.*};{0} s{season:00} e{episode:00}"

        //{title:the haunting} {0:.*} -> The Haunting of Bly Manor {0}
        if ("<remove>".equals(customQueryAndTitleMapping.getTo())) {
            customQueryAndTitleMapping.setTo("");
        }
        if (customQueryAndTitleMapping.getAffectedValue() == AffectedValue.QUERY && metaData.getQuery().isPresent()) {
            final String newQuery = mapValue(metaData, customQueryAndTitleMapping, metaData.getQuery().get());
            metaData.setQuery(newQuery);
        } else if ((customQueryAndTitleMapping.getAffectedValue() == AffectedValue.TITLE || customQueryAndTitleMapping.getAffectedValue() == AffectedValue.RESULT_TITLE) && metaData.getTitle().isPresent()) {
            final String newTitle = mapValue(metaData, customQueryAndTitleMapping, metaData.getTitle().get());
            metaData.setTitle(newTitle);
        }
    }

    private String mapValue(MetaData metaData, CustomQueryAndTitleMapping customQueryAndTitleMapping, String value) {
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "CustomQueryAndTitleMapping input \"{}\" using dataset \"{}\"", value, customQueryAndTitleMapping);
        String mappedValue = value;

        String replacementRegex = customQueryAndTitleMapping.getTo();
        if (metaData.getSeason().isPresent()) {
            replacementRegex = replacementRegex.replace("{season:00}", String.format("%02d", metaData.getSeason().get()));
            replacementRegex = replacementRegex.replace("{season:0}", String.valueOf(metaData.getSeason().get()));
        }
        if (metaData.getEpisode().isPresent()) {
            try {
                Integer episode = metaData.getEpisode().get();
                replacementRegex = replacementRegex.replace("{episode:00}", String.format("%02d", episode));
                replacementRegex = replacementRegex.replace("{episode:0}", episode.toString());
            } catch (NumberFormatException ignored) {
            }
            replacementRegex = replacementRegex.replace("{episode}", String.valueOf(metaData.getEpisode().get()));
        }
        replacementRegex = replacementRegex.replaceAll("\\{(?<groupName>[^\\}]*)\\}", "\\$\\{hydra${groupName}\\}");
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "CustomQueryAndTitleMapping input \"{}\" using replacement regex \"{}\"", value, replacementRegex);
        if (customQueryAndTitleMapping.isMatchAll()) {
            mappedValue = customQueryAndTitleMapping.getFromPattern().matcher(mappedValue).replaceFirst(replacementRegex);
        } else {
            mappedValue = customQueryAndTitleMapping.getFromPattern().matcher(mappedValue).replaceAll(replacementRegex);
        }
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapped input \"{}\" to \"{}\"", value, mappedValue);
        return mappedValue;
    }

    protected boolean isDatasetMatch(MetaData metaData, CustomQueryAndTitleMapping customQueryAndTitleMapping) {
        if (customQueryAndTitleMapping.getAffectedValue() == AffectedValue.QUERY && metaData.getQuery().isPresent()) {
            if (customQueryAndTitleMapping.isMatchAll()) {

                final boolean matches = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getQuery().get()).matches();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Query \"{}\" matches regex \"{}\": {}", metaData.getQuery().get(), customQueryAndTitleMapping.getFromPattern().pattern(), matches);
                return matches;
            } else {
                final boolean found = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getQuery().get()).find();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Query \"{}\" contains regex \"{}\": {}", metaData.getQuery().get(), customQueryAndTitleMapping.getFromPattern().pattern(), found);
                return found;
            }
        }

        if ((customQueryAndTitleMapping.getAffectedValue() == AffectedValue.RESULT_TITLE || customQueryAndTitleMapping.getAffectedValue() == AffectedValue.TITLE) && metaData.getTitle().isPresent()) {
            if (customQueryAndTitleMapping.isMatchAll()) {
                final boolean matches = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getTitle().get()).matches();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Title \"{}\" matches regex \"{}\": {}", metaData.getTitle().get(), customQueryAndTitleMapping.getFromPattern().pattern(), matches);
                return matches;
            } else {
                final boolean found = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getTitle().get()).find();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Title \"{}\" contains regex \"{}\": {}", metaData.getTitle().get(), customQueryAndTitleMapping.getFromPattern().pattern(), found);
                return found;
            }
        }
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Dataset does not match search request.\nDataset: {}\nSearch request:{}", customQueryAndTitleMapping.getFrom(), metaData);
        return false;
    }

    @Data
    @ReflectionMarker
    static class TestRequest {
        private CustomQueryAndTitleMapping mapping;
        private String exampleInput;
    }


    @Data
@ReflectionMarker
    @AllArgsConstructor
    static class TestResponse {
        private final String output;
        private final String error;
        private boolean isMatch;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    static class MetaData {
        enum Type {
            SEARCH_REQUEST,
            RESULT_TITLE
        }

        private Type type;
        private SearchType searchType;
        private String title;
        private String query;
        private Integer season;
        private Integer episode;

        public Optional<String> getTitle() {
            return Optional.ofNullable(title);
        }

        public Optional<String> getQuery() {
            return Optional.ofNullable(query);
        }

        public Optional<Integer> getSeason() {
            return Optional.ofNullable(season);
        }

        public Optional<Integer> getEpisode() {
            return Optional.ofNullable(episode);
        }

        public static MetaData fromSearchRequest(SearchRequest searchRequest) {
            Integer episode;
            if (searchRequest.getEpisode().isPresent()) {
                try {
                    episode = Integer.parseInt(searchRequest.getEpisode().get());
                } catch (NumberFormatException e) {
                    episode = null;
                }
            } else {
                episode = null;
            }

            return new MetaData(Type.SEARCH_REQUEST, searchRequest.getSearchType(), searchRequest.getTitle().orElse(null), searchRequest.getQuery().orElse(null), searchRequest.getSeason().orElse(null), episode);
        }

        public static MetaData fromSearchResult(SearchResultItem result) {
            Integer season = getIntegerAttribute(result, "season");
            Integer episode = getIntegerAttribute(result, "episode");
            return new MetaData(Type.RESULT_TITLE, null, result.getTitle(), null, season, episode);
        }

        @Nullable
        private static Integer getIntegerAttribute(SearchResultItem result, String attribute) {
            Integer integer = null;
            if (result.getAttributes().containsKey(attribute)) {
                try {
                    integer = Integer.parseInt(result.getAttributes().get(attribute));
                } catch (NumberFormatException ignored) {
                }
            }
            return integer;
        }


    }

}
