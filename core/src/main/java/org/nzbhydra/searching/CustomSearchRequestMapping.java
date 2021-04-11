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
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
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
import java.util.StringJoiner;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@RestController
public class CustomSearchRequestMapping {

    public enum AffectedValue {
        TITLE,
        QUERY
    }

    private static final Logger logger = LoggerFactory.getLogger(CustomSearchRequestMapping.class);

    @Autowired
    private ConfigProvider configProvider;


    public SearchRequest mapSearchRequest(SearchRequest searchRequest) {
        return mapSearchRequest(searchRequest, configProvider.getBaseConfig().getSearching().getCustomMappings());
    }

    public SearchRequest mapSearchRequest(SearchRequest searchRequest, List<Mapping> mappings) {
        final List<Mapping> datasets = mappings.stream()
                .filter(x -> searchRequest.getSearchType() == x.searchType)
                .filter(mapping -> isDatasetMatch(searchRequest, mapping))
                .filter(mapping -> {
                    if (mapping.to.contains("{season:") && !searchRequest.getSeason().isPresent()) {
                        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use mapping {} because no season information is available for {}", mapping, searchRequest.simpleToString());
                        return false;
                    }
                    if (mapping.to.contains("{episode:") && !searchRequest.getEpisode().isPresent()) {
                        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use mapping {} because no episode information is available for {}", mapping, searchRequest.simpleToString());
                        return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        if (datasets.isEmpty()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "No datasets found matching: {}", searchRequest.simpleToString());
            return searchRequest;
        }
        if (datasets.size() > 1) {
            logger.error("Unable to map search request ({}) because multiple mappings match it:\n{}", searchRequest.simpleToString(), Joiner.on("\n").join(mappings));
            return searchRequest;
        }
        final Mapping mapping = datasets.get(0);
        if (mapping.affectedValue == AffectedValue.TITLE) {
            logger.debug("");
        }

        mapSearchRequest(searchRequest, mapping);

        return searchRequest;
    }

    @SuppressWarnings("OptionalGetWithoutIsPresent")
    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/customMapping/test", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public TestResponse testMapping(@RequestBody TestRequest testRequest) {
        SearchRequest searchRequest = new SearchRequest();
        final String exampleInput = testRequest.exampleInput;
        if (!testRequest.mapping.getFromPattern().matcher(exampleInput).matches()) {
            return new TestResponse(null, null, false);
        }
        if (testRequest.mapping.affectedValue == AffectedValue.TITLE) {
            searchRequest.setTitle(exampleInput);
        } else {
            searchRequest.setQuery(exampleInput);
        }
        searchRequest.setSearchType(testRequest.mapping.searchType);
        searchRequest.setSeason(1);
        searchRequest.setEpisode("1");
        try {
            mapSearchRequest(searchRequest, testRequest.mapping);
            if (testRequest.mapping.affectedValue == AffectedValue.TITLE) {
                return new TestResponse(searchRequest.getTitle().get(), null, true);
            } else {
                return new TestResponse(searchRequest.getQuery().get(), null, true);
            }
        } catch (Exception e) {
            return new TestResponse(null, e.getMessage(), false);
        }

    }


    @SuppressWarnings("OptionalGetWithoutIsPresent")
    protected void mapSearchRequest(SearchRequest searchRequest, Mapping mapping) {
        //What should happen: q=Boku no Hero Academia S4, season=4, ep=21 -> Boku no Hero Academia s04e21
        //What the user should enter roughly: {0:(my hero academia|Boku no Hero Academia) {ignore:.*} -> {0} s{season:00} e{episode:00}
        //How it's configured: "TVSEARCH;QUERY;{0:(my hero academia|Boku no Hero Academia) {ignore:.*};{0} s{season:00} e{episode:00}"

        //{title:the haunting} {0:.*} -> The Haunting of Bly Manor {0}

        if (mapping.affectedValue == AffectedValue.QUERY) {
            final String newQuery = mapValue(searchRequest, mapping, searchRequest.getQuery().get());
            searchRequest.setQuery(newQuery);
        } else if (mapping.affectedValue == AffectedValue.TITLE) {
            final String newTitle = mapValue(searchRequest, mapping, searchRequest.getTitle().get());
            searchRequest.setTitle(newTitle);
        }
    }

    private String mapValue(SearchRequest searchRequest, Mapping mapping, String value) {
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapping input \"{}\" using dataset \"{}\"", value, mapping);
        String mappedValue = value;

        String replacementRegex = mapping.to;
        if (mapping.searchType == SearchType.TVSEARCH) {
            if (searchRequest.getSeason().isPresent()) {
                replacementRegex = replacementRegex.replace("{season:00}", String.format("%02d", searchRequest.getSeason().get()));
                replacementRegex = replacementRegex.replace("{season:0}", String.valueOf(searchRequest.getSeason().get()));
            }
            if (searchRequest.getEpisode().isPresent()) {
                try {
                    Integer episode = Integer.parseInt(searchRequest.getEpisode().get());
                    replacementRegex = replacementRegex.replace("{episode:00}", String.format("%02d", episode));
                    replacementRegex = replacementRegex.replace("{episode:0}", episode.toString());
                } catch (NumberFormatException ignored) {
                }
                replacementRegex = replacementRegex.replace("{episode}", searchRequest.getEpisode().get());
            }
        }
        replacementRegex = replacementRegex.replaceAll("\\{(?<groupName>[^\\^}].*)}", "\\$\\{hydra${groupName}\\}");
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapping input \"{}\" using replacement regex \"{}\"", value, replacementRegex);
        mappedValue = mappedValue.replaceAll(mapping.getFromPattern().pattern(), replacementRegex);
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapped input \"{}\" to \"{}\"", value, mappedValue);
        return mappedValue;
    }

    protected boolean isDatasetMatch(SearchRequest searchRequest, Mapping mapping) {
        if (mapping.affectedValue == AffectedValue.QUERY && searchRequest.getQuery().isPresent()) {
            final boolean matches = mapping.getFromPattern().matcher(searchRequest.getQuery().get()).matches();
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Query \"{}\" matches regex \"{}\": {}", searchRequest.getQuery().get(), mapping.getFromPattern().pattern(), matches);
            return matches;
        }
        if (mapping.affectedValue == AffectedValue.TITLE && searchRequest.getTitle().isPresent()) {
            final boolean matches = mapping.getFromPattern().matcher(searchRequest.getTitle().get()).matches();
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Title \"{}\" matches regex \"{}\": {}", searchRequest.getTitle().get(), mapping.getFromPattern().pattern(), matches);
            return matches;
        }
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Dataset does not match search request.\nDataset: {}\nSearch request:{}", mapping.from, searchRequest.simpleToString());
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
            this.searchType = SearchType.valueOf(split[0].toUpperCase());
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

}
