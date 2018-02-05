/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

import com.google.common.base.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerCategoryConfig;
import org.nzbhydra.config.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.IndexerCategoryConfig.SubCategory;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.Newznab;
import org.nzbhydra.indexers.capscheck.CapsCheckRequest.CheckType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.caps.CapsCategory;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Component
public class NewznabChecker {

    private static final Logger logger = LoggerFactory.getLogger(NewznabChecker.class);
    public static final int MAX_CONNECTIONS = 2;
    public static final int ID_THRESHOLD_PERCENT = 85;
    static int PAUSE_BETWEEN_CALLS = 1000;
    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected IndexerWebAccess indexerWebAccess;
    @Autowired
    private ApplicationEventPublisher eventPublisher;


    protected UriComponentsBuilder getBaseUri(IndexerConfig indexerConfig) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(indexerConfig.getHost()).path("/api");
        if (!Strings.isNullOrEmpty(indexerConfig.getApiKey())) {
            builder.queryParam("apikey", indexerConfig.getApiKey());
        }
        return builder;
    }

    public GenericResponse checkConnection(IndexerConfig indexerConfig) {
        Xml xmlResponse;
        try {
            URI uri = getBaseUri(indexerConfig).queryParam("t", "search").build().toUri();
            xmlResponse = indexerWebAccess.get(uri, indexerConfig);
            logger.debug("Checking connection to indexer {} using URI {}", indexerConfig.getName(), uri);
            if (xmlResponse instanceof NewznabXmlError) {
                logger.warn("Connection check with indexer {} failed with message: {}", indexerConfig.getName(), ((NewznabXmlError) xmlResponse).getDescription());
                return GenericResponse.notOk("Indexer returned message: " + ((NewznabXmlError) xmlResponse).getDescription());
            }
            NewznabXmlRoot rssRoot = (NewznabXmlRoot) xmlResponse;
            if (!rssRoot.getRssChannel().getItems().isEmpty()) {
                logger.info("Connection to indexer {} successful", indexerConfig.getName());
                return GenericResponse.ok();
            } else {
                logger.warn("Connection to indexer {} successful but search did not return any results", indexerConfig.getName());
                return GenericResponse.notOk("Indexer did not return any results");
            }
        } catch (IndexerAccessException e) {
            logger.warn("Connection check with indexer {} failed with message: {}", indexerConfig.getName(), e.getMessage());
            return GenericResponse.notOk(e.getMessage());
        }
    }


    public List<CheckCapsResponse> checkCaps(CapsCheckRequest request) {
        if (request.getCheckType() == CheckType.SINGLE) {
            return Collections.singletonList(checkCaps(request.getIndexerConfig()));
        } else {
            return checkCaps(request.getCheckType());
        }
    }


    /**
     * Attempts to determine which search IDs like IMDB or TVDB ID are supported by the indexer specified in the config.
     * <p>
     * Executes a search for each of the known IDs. If enough returned results match the expected title the ID is probably supported.
     */
    public CheckCapsResponse checkCaps(IndexerConfig indexerConfig) {
        List<CheckCapsRequest> requests = Arrays.asList(
                new CheckCapsRequest(indexerConfig, "tvsearch", "tvdbid", "121361", Collections.singletonList("Thrones")),
                new CheckCapsRequest(indexerConfig, "tvsearch", "rid", "24493", Collections.singletonList("Thrones")),
                new CheckCapsRequest(indexerConfig, "tvsearch", "tvmazeid", "82", Collections.singletonList("Thrones")),
                new CheckCapsRequest(indexerConfig, "tvsearch", "traktid", "1390", Collections.singletonList("Thrones")),
                new CheckCapsRequest(indexerConfig, "movie", "tmdbid", "1399", Arrays.asList("Avengers", "Vengadores")),
                new CheckCapsRequest(indexerConfig, "movie", "imdbid", "0848228", Arrays.asList("Avengers", "Vengadores"))
        );

        boolean allChecked = true;
        boolean configComplete = true;
        Integer timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout()) + 1;
        List<Callable<SingleCheckCapsResponse>> callables = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            CheckCapsRequest request = requests.get(i);
            callables.add(() -> {
                Thread.sleep(PAUSE_BETWEEN_CALLS); //Give indexer some time to breathe
                return singleCheckCaps(request, indexerConfig);
            });
        }

        Set<SingleCheckCapsResponse> responses = new HashSet<>();
        Set<IdType> supportedIds;
        String backend = null;
        try {
            logger.info("Will check capabilities of indexer {} using {} concurrent connections", indexerConfig.getName(), MAX_CONNECTIONS);
            ExecutorService executor = MdcThreadPoolExecutor.newWithInheritedMdc(MAX_CONNECTIONS);
            List<Future<SingleCheckCapsResponse>> futures = executor.invokeAll(callables);
            for (Future<SingleCheckCapsResponse> future : futures) {
                try {
                    SingleCheckCapsResponse response = future.get(timeout, TimeUnit.SECONDS);
                    if (response.getBackend() != null) {
                        backend = response.getBackend();
                    }
                    responses.add(response);
                } catch (ExecutionException e) {
                    if (e.getCause() instanceof IndexerAccessException) {
                        logger.error("Error while communicating with indexer: "+ e.getMessage());
                    } else {
                        logger.error("Unexpected error while checking caps", e);
                    }
                    allChecked = false;
                } catch (TimeoutException e) {
                    logger.error("Indexer {] failed to answer in {} seconds", indexerConfig.getName(), timeout);
                    allChecked = false;
                }
            }
            supportedIds = responses.stream().filter(SingleCheckCapsResponse::isSupported).map(x -> Newznab.paramValueToIdMap.get(x.getKey())).collect(Collectors.toSet());
            if (supportedIds.isEmpty()) {
                logger.info("Indexer {} does not support searching by any IDs", indexerConfig.getName());
            } else {
                logger.info("Indexer {} supports searching using the following IDs: {}", indexerConfig.getName(), supportedIds.stream().map(Enum::name).collect(Collectors.joining(", ")));
            }
            indexerConfig.setSupportedSearchIds(new ArrayList<>(supportedIds));

        } catch (InterruptedException e) {
            logger.error("Unexpected error while checking caps", e);
            allChecked = false;
        }

        try {
            indexerConfig.setCategoryMapping(setSupportedSearchTypesAndIndexerCategoryMapping(indexerConfig, timeout));
            if (indexerConfig.getSupportedSearchTypes().isEmpty()) {
                logger.info("Indexer {} does not support any special search types", indexerConfig.getName());
            } else {
                logger.info("Indexer {} supports the following search types: {}", indexerConfig.getName(), indexerConfig.getSupportedSearchTypes().stream().map(Enum::name).collect(Collectors.joining(", ")));
            }
        } catch (IndexerAccessException e) {
            logger.error("Error while accessing indexer", e);
            configComplete = false;
        }


        BackendType backendType = BackendType.NEWZNAB;
        if (backend == null && indexerConfig.getSearchModuleType() == SearchModuleType.NEWZNAB) {
            logger.info("Indexer {} didn't provide a backend type. Will use newznab.", indexerConfig.getName());
        } else if (backend != null) {
            try {
                backendType = BackendType.valueOf(backend.toUpperCase());
                logger.info("Indexer {} uses backend type {}", indexerConfig.getName(), backendType);
            } catch (IllegalArgumentException e) {
                logger.warn("Indexer {} reported unknown backend type {}. Will use newznab for now. Please report this.", indexerConfig.getName(), backend);
            }
        }
        indexerConfig.setBackend(backendType);
        indexerConfig.setConfigComplete(configComplete);
        indexerConfig.setAllCapsChecked(allChecked);
        indexerConfig.setEnabled(configComplete);

        return new CheckCapsResponse(indexerConfig, allChecked, configComplete);
    }

    private List<CheckCapsResponse> checkCaps(CapsCheckRequest.CheckType checkType) {
        List<IndexerConfig> configsToCheck = configProvider.getBaseConfig().getIndexers().stream().filter(x -> {
            return x.isEnabled() && x.isConfigComplete() && (checkType == CheckType.ALL || !x.isAllCapsChecked());
        }).collect(Collectors.toList());
        logger.info("Calling caps check for indexers {}", configsToCheck.stream().map(IndexerConfig::getName).collect(Collectors.joining(", ")));
        if (configsToCheck.isEmpty()) {
            return Collections.emptyList();
        }
        ExecutorService executor = Executors.newFixedThreadPool(configsToCheck.size());
        List<CheckCapsResponse> responses = new ArrayList<>();
        try {
            List<Future<CheckCapsResponse>> futures = executor.invokeAll(configsToCheck.stream().map(x -> (Callable<CheckCapsResponse>) () -> checkCaps(x)).collect(Collectors.toList()));
            for (Future<CheckCapsResponse> future : futures) {
                try {
                    responses.add(future.get());
                } catch (ExecutionException e) {
                    logger.error("Error while calling caps check", e);
                }
            }

        } catch (InterruptedException e) {
            logger.error("Error while calling caps check for all indexers", e);
        }
        return responses;
    }

    public IndexerCategoryConfig setSupportedSearchTypesAndIndexerCategoryMapping(IndexerConfig indexerConfig, int timeout) throws IndexerAccessException {
        List<IdType> supportedSearchIds = indexerConfig.getSupportedSearchIds();
        List<ActionAttribute> supportedSearchTypes = new ArrayList<>();
        if (supportedSearchIds.contains(IdType.TVDB) || supportedSearchIds.contains(IdType.TVRAGE) || supportedSearchIds.contains(IdType.TVMAZE) || supportedSearchIds.contains(IdType.TRAKT)) {
            supportedSearchTypes.add(ActionAttribute.TVSEARCH);
        }
        if (supportedSearchIds.contains(IdType.IMDB) || supportedSearchIds.contains(IdType.TMDB)) {
            supportedSearchTypes.add(ActionAttribute.MOVIE);
        }
        URI uri = getBaseUri(indexerConfig).queryParam("t", "caps").build().toUri();
        CapsRoot capsRoot = indexerWebAccess.get(uri, indexerConfig);
        if (capsRoot.getSearching().getAudioSearch() != null) {
            supportedSearchTypes.add(ActionAttribute.AUDIO);
        }
        if (capsRoot.getSearching().getBookSearch() != null) {
            supportedSearchTypes.add(ActionAttribute.BOOK);
        }
        indexerConfig.setSupportedSearchTypes(supportedSearchTypes);

        IndexerCategoryConfig categoryConfig = new IndexerCategoryConfig();
        List<CapsCategory> categories = readAndConvertCategories(capsRoot, categoryConfig);
        setCategorySpecificMappings(categoryConfig, categories);
        return categoryConfig;
    }

    private void setCategorySpecificMappings(IndexerCategoryConfig categoryConfig, List<CapsCategory> categories) {
        Optional<CapsCategory> anime = categories.stream().filter(x -> x.getName().toLowerCase().contains("anime") && x.getId() / 1000 != 6).findFirst(); //Sometimes 6070 is anime as subcategory of porn, don't use that
        anime.ifPresent(capsCategory -> categoryConfig.setAnime(capsCategory.getId()));

        Optional<CapsCategory> audiobook = categories.stream().filter(x -> x.getName().toLowerCase().contains("audiobook")).findFirst();
        audiobook.ifPresent(capsCategory -> categoryConfig.setAudiobook(capsCategory.getId()));

        Optional<CapsCategory> comic = categories.stream().filter(x -> x.getName().toLowerCase().contains("comic")).findFirst();
        comic.ifPresent(capsCategory -> categoryConfig.setComic(capsCategory.getId()));

        Optional<CapsCategory> ebook = categories.stream().filter(x -> x.getName().toLowerCase().contains("ebook")).findFirst();
        ebook.ifPresent(capsCategory -> categoryConfig.setEbook(capsCategory.getId()));

        Optional<CapsCategory> magazine = categories.stream().filter(x -> x.getName().toLowerCase().contains("magazine") || x.getName().toLowerCase().contains("mags")).findFirst();
        magazine.ifPresent(capsCategory -> categoryConfig.setMagazine(capsCategory.getId()));

    }

    private List<CapsCategory> readAndConvertCategories(CapsRoot capsRoot, IndexerCategoryConfig categoryConfig) {
        List<CapsCategory> categories = new ArrayList<>(capsRoot.getCategories().getCategories());
        List<MainCategory> configMainCategories = new ArrayList<>();
        for (CapsCategory category : capsRoot.getCategories().getCategories()) {
            List<SubCategory> configSubcats = new ArrayList<>();
            if (category.getSubCategories() != null) {
                categories.addAll(category.getSubCategories());
                configSubcats = category.getSubCategories().stream().map(x -> new SubCategory(x.getId(), x.getName())).collect(Collectors.toList());
            }
            configMainCategories.add(new MainCategory(category.getId(), category.getName(), configSubcats));
        }
        categoryConfig.setCategories(configMainCategories);

        return categories;
    }

    private SingleCheckCapsResponse singleCheckCaps(CheckCapsRequest request, IndexerConfig indexerConfig) throws IndexerAccessException {
        URI uri = getBaseUri(request.getIndexerConfig()).queryParam("t", request.getTMode()).queryParam(request.getKey(), request.getValue()).build().toUri();
        logger.debug("Calling URL {}", uri);
        Xml response = indexerWebAccess.get(uri, indexerConfig);

        if (response instanceof NewznabXmlError) {
            String errorDescription = ((NewznabXmlError) response).getDescription();
            if (errorDescription.toLowerCase().contains("function not available")) {
                logger.error("Indexer {} reports that it doesn't support the ID type {}", request.indexerConfig.getName(), request.getKey());
                eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(),"Doesn't support " + request.getKey()));
                return new SingleCheckCapsResponse(request.getKey(), false, null);
            }
            logger.debug("RSS error from indexer {}: {}", request.indexerConfig.getName(), errorDescription);
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(),"RSS error from indexer: " + errorDescription));
            throw new IndexerAccessException("RSS error from indexer: " + errorDescription);
        }
        NewznabXmlRoot rssRoot = (NewznabXmlRoot) response;

        if (rssRoot.getRssChannel().getItems().isEmpty()) {
            logger.info("Indexer {} probably doesn't support the ID type {}. It returned no results.", request.indexerConfig.getName(), request.getKey());
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(),"Probably doesn't support " + request.getKey()));
            return new SingleCheckCapsResponse(request.getKey(), false, rssRoot.getRssChannel().getGenerator());
        }
        long countCorrectResults = rssRoot.getRssChannel().getItems().stream().filter(x -> request.getTitleExpectedToContain().stream().anyMatch(y -> x.getTitle().toLowerCase().contains(y.toLowerCase()))).count();
        float percentCorrect = (100 * countCorrectResults) / rssRoot.getRssChannel().getItems().size();
        boolean supported = percentCorrect >= ID_THRESHOLD_PERCENT;
        if (supported) {
            logger.info("Indexer {} probably supports the ID type {}. {}% of results were correct.", request.indexerConfig.getName(), request.getKey(), percentCorrect);
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(),"Probably supports " + request.getKey()));
            return new SingleCheckCapsResponse(request.getKey(), true, rssRoot.getRssChannel().getGenerator());
        } else {
            logger.info("Indexer {} probably doesn't support the ID type {}. {}% of results were correct.", request.indexerConfig.getName(), request.getKey(), percentCorrect);
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(),"Probably doesn't support " + request.getKey()));
            return new SingleCheckCapsResponse(request.getKey(), false, rssRoot.getRssChannel().getGenerator());
        }
    }

    @Data
    @AllArgsConstructor
    public static class CheckerEvent {
        private String indexerName;
        private String message;
    }

    @Data
    @AllArgsConstructor
    private class CheckCapsRequest {
        private IndexerConfig indexerConfig;
        private String tMode;
        private String key;
        private String value;
        private List<String> titleExpectedToContain;
    }

    @Data
    @AllArgsConstructor
    private class SingleCheckCapsResponse {
        private String key;
        private boolean supported;
        private String backend;
    }


}
