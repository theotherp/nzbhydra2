/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Multimap;
import com.google.common.collect.Multimaps;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.indexer.CapsCheckRequest;
import org.nzbhydra.config.indexer.CheckCapsResponse;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.capscheck.IndexerChecker.CheckerEvent;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
public class IndexerWeb {

    private static final Logger logger = LoggerFactory.getLogger(IndexerWeb.class);

    private static final Pattern JACKETT_INDEXER_PATTERM = Pattern.compile(".*/indexers/(.*)/results/torznab.*");

    @Autowired
    private IndexerChecker newznabChecker;
    @Autowired
    private SimpleConnectionChecker simpleConnectionChecker;
    @Autowired
    private JacketConfigRetriever jacketConfigRetriever;
    @Autowired
    private ProwlarrConfigRetriever prowlarrConfigRetriever;

    Multimap<String, String> multimap = Multimaps.synchronizedMultimap(
            HashMultimap.create());

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCaps", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public List<CheckCapsResponse> checkCaps(@RequestBody CapsCheckRequest capsCheckRequest) {
        multimap.clear();
        return newznabChecker.checkCaps(capsCheckRequest);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCapsMessages/{indexerName}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public Collection<String> getCheckerMessages(@PathVariable String indexerName) {
        return multimap.get(indexerName);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCapsMessages", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Collection<String>> getCheckerMessages() {
        return multimap.asMap();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse testConnection(@RequestBody IndexerConfig indexerConfig) {
        if (indexerConfig.getSearchModuleType() == SearchModuleType.NEWZNAB || indexerConfig.getSearchModuleType() == SearchModuleType.TORZNAB) {
            return newznabChecker.checkConnection(indexerConfig);
        } else {
            return simpleConnectionChecker.checkConnection(indexerConfig);
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/readJackettConfig", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public JacketConfigReadResponse readJackettConfig(@RequestBody JacketConfigReadRequest configReadRequest) throws Exception {
        JacketConfigReadResponse response = new JacketConfigReadResponse();
        List<IndexerConfig> newConfigs = new ArrayList<>(configReadRequest.existingIndexers);
        List<IndexerConfig> foundJackettConfigs = jacketConfigRetriever.retrieveIndexers(configReadRequest.jackettConfig);
        int countUpdatedTrackers = 0;
        int countAddedTrackers = 0;

        //Update existing configs, add new ones
        for (IndexerConfig foundJackettConfig : foundJackettConfigs) {
            final Optional<IndexerConfig> updatedIndexer = configReadRequest.existingIndexers.stream().filter(x -> isMatch(foundJackettConfig, x)).findFirst();
            if (updatedIndexer.isPresent()) {
                updatedIndexer.get().setHost(foundJackettConfig.getHost());
                updatedIndexer.get().setApiKey(foundJackettConfig.getApiKey());
                updatedIndexer.get().setSupportedSearchIds(foundJackettConfig.getSupportedSearchIds());
                updatedIndexer.get().setSupportedSearchTypes(foundJackettConfig.getSupportedSearchTypes());
                countUpdatedTrackers++;
            } else {
                newConfigs.add(foundJackettConfig);
                countAddedTrackers++;
            }
        }

        logger.info("Found {} new and {} updated trackers", countAddedTrackers, countUpdatedTrackers);

        response.setNewIndexersConfig(newConfigs);
        response.setUpdatedTrackers(countUpdatedTrackers);
        response.setAddedTrackers(countAddedTrackers);

        return response;
    }

    private boolean isMatch(IndexerConfig a, IndexerConfig b) {
        final Matcher aMatcher = JACKETT_INDEXER_PATTERM.matcher(a.getHost().toLowerCase());
        if (!aMatcher.matches()) {
            return false;
        }
        final Matcher bMatcher = JACKETT_INDEXER_PATTERM.matcher(b.getHost().toLowerCase());
        if (!bMatcher.matches()) {
            return false;
        }
        return aMatcher.group(1).equals(bMatcher.group(1));
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/readProwlarrConfig", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> readProwlarrConfig(@RequestBody ProwlarrConfigReadRequest configReadRequest) {
        ProwlarrConfigReadResponse response = new ProwlarrConfigReadResponse();
        List<IndexerConfig> foundProwlarrConfigs;
        try {
            foundProwlarrConfigs = prowlarrConfigRetriever.retrieveIndexers(configReadRequest.prowlarrConfig);
        } catch (IndexerAccessException e) {
            logger.error("Error reading Prowlarr config", e);
            ProwlarrConfigReadResponse errorResponse = new ProwlarrConfigReadResponse();
            errorResponse.setErrorMessage(e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            logger.error("Unexpected error reading Prowlarr config", e);
            ProwlarrConfigReadResponse errorResponse = new ProwlarrConfigReadResponse();
            errorResponse.setErrorMessage("Error reading Prowlarr config: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }

        // Get names of newly found Prowlarr indexers
        List<String> foundProwlarrNames = foundProwlarrConfigs.stream()
                .map(IndexerConfig::getName)
                .toList();

        // Remove existing "(Prowlarr)" indexers that are not in the new list
        List<IndexerConfig> newConfigs = new ArrayList<>();
        int countRemovedIndexers = 0;
        for (IndexerConfig existing : configReadRequest.existingIndexers) {
            if (existing.getName().endsWith("(Prowlarr)")) {
                if (foundProwlarrNames.contains(existing.getName())) {
                    // Keep it, will be updated below
                    newConfigs.add(existing);
                } else {
                    // Remove - no longer in Prowlarr
                    countRemovedIndexers++;
                    logger.info("Removing Prowlarr indexer no longer found: {}", existing.getName());
                }
            } else {
                newConfigs.add(existing);
            }
        }

        int countUpdatedIndexers = 0;
        int countAddedIndexers = 0;

        // Update existing configs, add new ones
        for (IndexerConfig foundProwlarrConfig : foundProwlarrConfigs) {
            final Optional<IndexerConfig> existingIndexer = newConfigs.stream()
                    .filter(x -> x.getName().equals(foundProwlarrConfig.getName()))
                    .findFirst();
            if (existingIndexer.isPresent()) {
                existingIndexer.get().setHost(foundProwlarrConfig.getHost());
                existingIndexer.get().setApiKey(foundProwlarrConfig.getApiKey());
                existingIndexer.get().setSearchModuleType(foundProwlarrConfig.getSearchModuleType());
                countUpdatedIndexers++;
            } else {
                newConfigs.add(foundProwlarrConfig);
                countAddedIndexers++;
            }
        }

        logger.info("Found {} new, {} updated and {} removed indexers from Prowlarr", countAddedIndexers, countUpdatedIndexers, countRemovedIndexers);

        response.setNewIndexersConfig(newConfigs);
        response.setAddedIndexers(countAddedIndexers);
        response.setUpdatedIndexers(countUpdatedIndexers);
        response.setRemovedIndexers(countRemovedIndexers);

        return ResponseEntity.ok(response);
    }

    @EventListener
    public void handleCheckerEvent(CheckerEvent event) {
        if (!multimap.get(event.getIndexerName()).contains(event.getMessage())) {
            multimap.put(event.getIndexerName(), event.getMessage());
        }
    }

    @Data
    @ReflectionMarker
    private static class JacketConfigReadRequest {
        private List<IndexerConfig> existingIndexers;
        private IndexerConfig jackettConfig;
    }

    @Data
    @ReflectionMarker
    private static class JacketConfigReadResponse {
        private List<IndexerConfig> newIndexersConfig;
        private int addedTrackers;
        private int updatedTrackers;
    }

    @Data
    @ReflectionMarker
    static class ProwlarrConfigReadRequest {
        List<IndexerConfig> existingIndexers;
        IndexerConfig prowlarrConfig;
    }

    @Data
    @ReflectionMarker
    static class ProwlarrConfigReadResponse {
        private List<IndexerConfig> newIndexersConfig;
        private int addedIndexers;
        private int updatedIndexers;
        private int removedIndexers;
        private String errorMessage;
    }

}
