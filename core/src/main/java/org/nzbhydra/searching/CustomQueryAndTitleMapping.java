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

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.Joiner;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.jetbrains.annotations.Nullable;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
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
import java.util.StringJoiner;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@RestController
public class CustomQueryAndTitleMapping {

    public enum AffectedValue {
        TITLE,
        QUERY,
        RESULT_TITLE
    }

    private static final Logger logger = LoggerFactory.getLogger(CustomQueryAndTitleMapping.class);

    @Autowired
    private ConfigProvider configProvider;


    public CustomQueryAndTitleMapping() {
    }

    public CustomQueryAndTitleMapping(BaseConfig baseConfig) {
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

    public SearchRequest mapSearchRequest(SearchRequest searchRequest, List<Mapping> mappings) {
        if (mappings.isEmpty() || mappings.stream().allMatch(x -> x.getAffectedValue() == AffectedValue.RESULT_TITLE)) {
            return searchRequest;
        }
        final MetaData metaData = mapMetaData(MetaData.fromSearchRequest(searchRequest), mappings);

        metaData.getQuery().ifPresent(searchRequest::setQuery);
        metaData.getTitle().ifPresent(searchRequest::setTitle);
        return searchRequest;
    }


    public SearchResultItem mapSearchResult(SearchResultItem searchResult, List<Mapping> mappings) {
        if (mappings.isEmpty() || mappings.stream().noneMatch(x -> x.getAffectedValue() == AffectedValue.RESULT_TITLE)) {
            return searchResult;
        }
        final MetaData metaData = mapMetaData(MetaData.fromSearchResult(searchResult), mappings);

        metaData.getTitle().ifPresent(searchResult::setTitle);
        return searchResult;
    }

    public MetaData mapMetaData(MetaData metaData, List<Mapping> mappings) {
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
            );
            if (!oldQuery.equals(metaData.getQuery().get())) {
                logger.debug("Replaced umlauts. Old query: {}. New query: {}", oldQuery, metaData.getQuery().get());
            }

        }

        final List<Mapping> datasets = mappings.stream()
            .filter(x -> metaData.getSearchType() == x.searchType || metaData.type == MetaData.Type.RESULT_TITLE)
            .filter(mapping -> isDatasetMatch(metaData, mapping))
            .filter(mapping -> {
                if (mapping.to.contains("{season:") && !metaData.getSeason().isPresent()) {
                    logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use mapping {} because no season information is available for {}", mapping, metaData);
                    return false;
                }
                if (mapping.to.contains("{episode:") && !metaData.getEpisode().isPresent()) {
                    logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use mapping {} because no episode information is available for {}", mapping, metaData);
                    return false;
                }
                return true;
            })
            .collect(Collectors.toList());

        if (datasets.isEmpty()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "No datasets found matching: {}", metaData);
            return metaData;
        }
        if (datasets.size() > 1) {
            logger.error("Unable to map search request ({}) because multiple mappings match it:\n{}", metaData, Joiner.on("\n").join(mappings));
            return metaData;
        }
        final Mapping mapping = datasets.get(0);

        mapMetaData(metaData, mapping);

        return metaData;
    }

    @SuppressWarnings("OptionalGetWithoutIsPresent")
    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/customMapping/test", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public TestResponse testMapping(@RequestBody TestRequest testRequest) {
        MetaData metaData = new MetaData();
        final String exampleInput = testRequest.exampleInput;
        if (!testRequest.mapping.getFromPattern().matcher(exampleInput).matches()) {
            return new TestResponse(null, null, false);
        }
        if (testRequest.mapping.affectedValue == AffectedValue.QUERY) {
            metaData.setQuery(exampleInput);
        } else {
            metaData.setTitle(exampleInput);
        }
        metaData.setSearchType(testRequest.mapping.searchType);
        metaData.setSeason(1);
        metaData.setEpisode(2);
        try {
            mapMetaData(metaData, testRequest.mapping);
            if (testRequest.mapping.affectedValue == AffectedValue.QUERY) {
                return new TestResponse(metaData.getQuery().get(), null, true);
            } else {
                return new TestResponse(metaData.getTitle().get(), null, true);
            }
        } catch (Exception e) {
            return new TestResponse(null, e.getMessage(), false);
        }

    }


    protected void mapMetaData(MetaData metaData, Mapping mapping) {
        //What should happen: q=Boku no Hero Academia S4, season=4, ep=21 -> Boku no Hero Academia s04e21
        //What the user should enter roughly: {0:(my hero academia|Boku no Hero Academia) {ignore:.*} -> {0} s{season:00} e{episode:00}
        //How it's configured: "TVSEARCH;QUERY;{0:(my hero academia|Boku no Hero Academia) {ignore:.*};{0} s{season:00} e{episode:00}"

        //{title:the haunting} {0:.*} -> The Haunting of Bly Manor {0}

        if (mapping.affectedValue == AffectedValue.QUERY && metaData.getQuery().isPresent()) {
            final String newQuery = mapValue(metaData, mapping, metaData.getQuery().get());
            metaData.setQuery(newQuery);
        } else if ((mapping.affectedValue == AffectedValue.TITLE || mapping.affectedValue == AffectedValue.RESULT_TITLE) && metaData.getTitle().isPresent()) {
            final String newTitle = mapValue(metaData, mapping, metaData.getTitle().get());
            metaData.setTitle(newTitle);
        }
    }

    private String mapValue(MetaData metaData, Mapping mapping, String value) {
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapping input \"{}\" using dataset \"{}\"", value, mapping);
        String mappedValue = value;

        String replacementRegex = mapping.to;
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
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapping input \"{}\" using replacement regex \"{}\"", value, replacementRegex);
        mappedValue = mapping.getFromPattern().matcher(mappedValue).replaceFirst(replacementRegex);
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapped input \"{}\" to \"{}\"", value, mappedValue);
        return mappedValue;
    }

    protected boolean isDatasetMatch(MetaData metaData, Mapping mapping) {
        if (mapping.affectedValue == AffectedValue.QUERY && metaData.getQuery().isPresent()) {
            final boolean matches = mapping.getFromPattern().matcher(metaData.getQuery().get()).matches();
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Query \"{}\" matches regex \"{}\": {}", metaData.getQuery().get(), mapping.getFromPattern().pattern(), matches);
            return matches;
        }
        if ((mapping.affectedValue == AffectedValue.RESULT_TITLE || mapping.affectedValue == AffectedValue.TITLE) && metaData.getTitle().isPresent()) {
            final boolean matches = mapping.getFromPattern().matcher(metaData.getTitle().get()).matches();
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Title \"{}\" matches regex \"{}\": {}", metaData.getTitle().get(), mapping.getFromPattern().pattern(), matches);
            return matches;
        }
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Dataset does not match search request.\nDataset: {}\nSearch request:{}", mapping.from, metaData);
        return false;
    }

    @Data
    public static class Mapping {

        private SearchType searchType;
        private AffectedValue affectedValue;
        private String from;
        private String to;
        @JsonIgnore
        private Pattern fromPattern;

        public Mapping() {
        }

        public Mapping(String configValue) {
            final String[] split = configValue.split(";");
            if (split.length != 4) {
                throw new IllegalArgumentException("Unable to parse value: " + configValue);
            }
            this.searchType = split[0].equals("null") ? SearchType.SEARCH : SearchType.valueOf(split[0].toUpperCase());
            this.affectedValue = AffectedValue.valueOf(split[1].toUpperCase());
            this.from = split[2];
            this.to = split[3];
        }

        @JsonIgnore
        public Pattern getFromPattern() {
            if (fromPattern == null) {
                String regex = from.replaceAll("\\{(?<groupName>[^:]*):(?<hydraContent>[^\\{\\}]*)\\}", "(?<hydra${groupName}>${hydraContent})");
                fromPattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
            }
            return fromPattern;
        }

        @Override
        public String toString() {
            return new StringJoiner(", ", Mapping.class.getSimpleName() + "[", "]")
                    .add("from='" + from + "'")
                    .add("to='" + to + "'")
                    .toString();
        }
    }

    @Data
    static class TestRequest {
        private Mapping mapping;
        private String exampleInput;
    }


    @Data
    @AllArgsConstructor
    static class TestResponse {
        private final String output;
        private final String error;
        private boolean isMatch;
    }

    @Data
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
