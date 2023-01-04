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

package org.nzbhydra.indexers.capscheck;

import org.nzbhydra.Jackson;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlSearching;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlIndexer;
import org.nzbhydra.mapping.newznab.xml.caps.jackett.JacketCapsXmlRoot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class JacketConfigRetriever {

    private static final Logger logger = LoggerFactory.getLogger(JacketConfigRetriever.class);


    @Autowired
    private IndexerWebAccess indexerWebAccess;


    public List<IndexerConfig> retrieveIndexers(IndexerConfig jackettConfig) throws Exception {

        final URI uri = IndexerChecker.getBaseUri(jackettConfig)
                .pathSegment("v2.0", "indexers", "all", "results", "torznab")
                .queryParam("t", "indexers")
                .queryParam("configured", "true")
                .build().toUri();
        logger.info("Getting configured jackett trackers from {}", uri);
        final Object response = indexerWebAccess.get(uri, jackettConfig);
        if (response instanceof NewznabXmlError) {
            NewznabXmlError error = (NewznabXmlError) response;
            throw new IndexerAccessException("Jackett report error " + error.getCode() + ": " + error.getDescription());
        }
        if (!(response instanceof JacketCapsXmlRoot)) {
            throw new IOException("Unable to parse response from jackett");
        }
        JacketCapsXmlRoot root = (JacketCapsXmlRoot) response;

        List<IndexerConfig> configs = new ArrayList<>();
        for (JacketCapsXmlIndexer indexer : root.getIndexers()) {
            //Use jackett config as template
            IndexerConfig currentConfig = Jackson.JSON_MAPPER.readValue(Jackson.JSON_MAPPER.writeValueAsString(jackettConfig), IndexerConfig.class);
            currentConfig.setHost(IndexerChecker.getBaseUri(jackettConfig)
                    .pathSegment("v2.0", "indexers", indexer.getId(), "results", "torznab")
                    .replaceQueryParam("apikey").build().toUriString());
            currentConfig.setConfigComplete(true);
            currentConfig.setAllCapsChecked(true);
            currentConfig.setSearchModuleType(SearchModuleType.TORZNAB);
            currentConfig.setName(indexer.getTitle());
            logger.info("Found configured tracker {} at Jackett", indexer.getTitle());

            final CapsXmlSearching searching = indexer.getCaps().getSearching();
            IndexerChecker.fillIndexerConfigFromXmlCapsResponse(currentConfig, indexer.getCaps());

            //We actually rely on the information from Jackett so we set the supported search types and IDs according to its infos, potentially overwriting the info we determined in the IndexerChecker code
            currentConfig.getSupportedSearchTypes().clear();
            if (searching.getSearch() != null && searching.getSearch().isAvailable()) {
                currentConfig.getSupportedSearchTypes().add(ActionAttribute.SEARCH);
            }
            if (searching.getAudioSearch() != null && searching.getAudioSearch().isAvailable()) {
                currentConfig.getSupportedSearchTypes().add(ActionAttribute.AUDIO);
            }
            if (searching.getTvSearch() != null && searching.getTvSearch().isAvailable()) {
                currentConfig.getSupportedSearchTypes().add(ActionAttribute.TVSEARCH);
            }
            if (searching.getMovieSearch() != null && searching.getMovieSearch().isAvailable()) {
                currentConfig.getSupportedSearchTypes().add(ActionAttribute.MOVIE);
            }
            if (searching.getBookSearch() != null && searching.getBookSearch().isAvailable()) {
                currentConfig.getSupportedSearchTypes().add(ActionAttribute.BOOK);
            }

            final List<String> supportedParams = new ArrayList<>();
            if (searching.getTvSearch() != null) {
                supportedParams.addAll(Arrays.asList(searching.getTvSearch().getSupportedParams().split(",")));
            }
            if (searching.getMovieSearch() != null) {
                supportedParams.addAll(Arrays.asList(searching.getMovieSearch().getSupportedParams().split(",")));
            }
            final List<MediaIdType> supportedIds = supportedParams.stream().map(this::mediaIdTypeFromString).filter(Objects::nonNull).collect(Collectors.toList());
            currentConfig.setSupportedSearchIds(supportedIds);
            configs.add(currentConfig);

            logger.debug("Determined config: {}", currentConfig);
        }

        return configs;

    }

    private MediaIdType mediaIdTypeFromString(String string) {
        if (string == null) {
            return null;
        }
        MediaIdType mediaIdType = getMediaIdTypeOrNull(string.toUpperCase());
        if (mediaIdType != null) {
            return mediaIdType;
        }
        mediaIdType = getMediaIdTypeOrNull(string.toUpperCase().replace("ID", ""));
        if (mediaIdType != null) {
            return mediaIdType;
        }
        mediaIdType = getMediaIdTypeOrNull(string.toUpperCase() + "ID");
        return mediaIdType;
    }

    private MediaIdType getMediaIdTypeOrNull(String string) {
        try {
            final MediaIdType mediaIdType = MediaIdType.valueOf(string);
            return mediaIdType;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }


       /* private static class XmlHandler extends DefaultHandler {

            private IndexerConfig currentConfig = new IndexerConfig();

            String currentValue;

            @Override
            public void startElement(String uri, String localName, String elementName, Attributes attributes) throws SAXException {
                logger.info("Start: " + elementName);
                if (elementName.endsWith("search")) {
                    final String supported = attributes.getValue("supported");
                    if (!"yes".equals(supported)) {
                        return;
                    }
                    final List<String> supportedParams = Arrays.asList(attributes.getValue("supportedParams").split(","));
                    final List<MediaIdType> supportedIds = supportedParams.stream().map(this::getMediaIdTypeOrNull).filter(Objects::nonNull).collect(Collectors.toList());
                    if (elementName.equals("tv-search") && supportedIds.contains(MediaIdType.IMDB)) {
                        supportedIds.remove(MediaIdType.IMDB);
                        supportedIds.add(MediaIdType.TVIMDB);
                    }
                    currentConfig.getSupportedSearchIds().addAll(supportedIds);

                    switch (elementName) {
                        case "search":
                            currentConfig.getSupportedSearchTypes().add(ActionAttribute.SEARCH);
                            break;
                        case "tv-search":
                            currentConfig.getSupportedSearchTypes().add(ActionAttribute.TVSEARCH);
                            break;
                        case "movie-search":
                            currentConfig.getSupportedSearchTypes().add(ActionAttribute.MOVIE);
                            break;
                        case "audio-search":
                            currentConfig.getSupportedSearchTypes().add(ActionAttribute.AUDIO);
                            break;
                    }


                }
            }

}
*/

}
