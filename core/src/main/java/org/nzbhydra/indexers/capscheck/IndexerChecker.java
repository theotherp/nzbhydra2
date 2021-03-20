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

import com.google.common.base.Strings;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.SubCategory;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.capscheck.CapsCheckRequest.CheckType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.logging.MdcThreadPoolExecutor;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategory;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.searching.SearchModuleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Component
public class IndexerChecker {

    private static final Logger logger = LoggerFactory.getLogger(IndexerChecker.class);
    static int PAUSE_BETWEEN_CALLS = 1000;
    public static final int MAX_CONNECTIONS = 2;
    /**
     * Percentage of results that must be correct so that the search with an ID is interpreted as correct
     */
    public static final int ID_THRESHOLD_PERCENT = 60;

    /**
     * Host/Indexer specific limits
     */
    private static final Set<CapsCheckLimit> CAPS_CHECK_LIMITS = Sets.newHashSet(new CapsCheckLimit(1, 2000, "rarbg"));

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected IndexerWebAccess indexerWebAccess;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private SearchModuleProvider searchModuleProvider;


    public List<CheckCapsResponse> checkCaps(CapsCheckRequest request) {
        if (request.getCheckType() == CheckType.SINGLE) {
            return Collections.singletonList(checkCaps(request.getIndexerConfig()));
        } else {
            return checkCaps(request.getCheckType());
        }
    }

    public GenericResponse checkConnection(IndexerConfig indexerConfig) {
        Xml xmlResponse;
        try {
            URI uri = getBaseUri(indexerConfig).queryParam("t", "search").queryParam("q", "mp3").build().toUri();
            xmlResponse = indexerWebAccess.get(uri, indexerConfig);
            logger.debug("Checking connection to indexer {} using URI {}", indexerConfig.getName(), uri);
            if (xmlResponse instanceof NewznabXmlError) {
                logger.warn("Connection check with indexer {} failed with message: {}", indexerConfig.getName(), ((NewznabXmlError) xmlResponse).getDescription());
                return GenericResponse.notOk("Indexer returned message: " + ((NewznabXmlError) xmlResponse).getDescription());
            }
            NewznabXmlRoot rssRoot = (NewznabXmlRoot) xmlResponse;
            searchModuleProvider.registerApiHitLimits(indexerConfig.getName(), 1);

            if (!rssRoot.getRssChannel().getItems().isEmpty()) {
                if (indexerConfig.getSearchModuleType() == SearchModuleType.NEWZNAB && isTorznabResult(rssRoot) && !indexerConfig.getHost().contains("animetosho")) {
                    logger.error("Indexer added as newznab but returns torznab results");
                    return GenericResponse.notOk("You added the indexer as newznab indexer but the results indicate a torznab indexer");
                }
                if (indexerConfig.getSearchModuleType() == SearchModuleType.TORZNAB && isNewznabResult(rssRoot) && !indexerConfig.getHost().contains("animetosho")) {
                    logger.error("Indexer added as torznab but returns newznab results");
                    return GenericResponse.notOk("You added the indexer as torznab indexer but the results indicate a newznab indexer");
                }

                logger.info("Connection to indexer {} successful", indexerConfig.getName());
                return GenericResponse.ok();
            } else {
                logger.warn("Connection to indexer {} successful but search did not return any results", indexerConfig.getName());
                return GenericResponse.notOk("Indexer did not return any results");
            }
        } catch (IndexerAccessException | IllegalArgumentException e) {
            logger.warn("Connection check with indexer {} failed with message: {}", indexerConfig.getName(), e.getMessage());
            return GenericResponse.notOk(e.getMessage());
        }
    }


    public List<IndexerConfig> retrieveJackettIndexers() {
        List<IndexerConfig> configs = new ArrayList<>();


        return null;
    }

    static UriComponentsBuilder getBaseUri(IndexerConfig indexerConfig) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(indexerConfig.getHost()).path("/api");
        if (!Strings.isNullOrEmpty(indexerConfig.getApiKey())) {
            builder.queryParam("apikey", indexerConfig.getApiKey());
        }
        return builder;
    }

    protected boolean isTorznabResult(NewznabXmlRoot rssRoot) {
        return rssRoot.getRssChannel().getItems().stream().anyMatch(x -> x.getEnclosures().stream().anyMatch(enclosure -> "application/x-bittorrent".equals(enclosure.getType())) || !x.getTorznabAttributes().isEmpty());
    }

    protected boolean isNewznabResult(NewznabXmlRoot rssRoot) {
        return rssRoot.getRssChannel().getItems().stream().anyMatch(x -> x.getEnclosures().stream().anyMatch(enclosure -> "application/x-nzb".equals(enclosure.getType())));
    }

    /**
     * Attempts to determine which search IDs like IMDB or TVDB ID are supported by the indexer specified in the config.
     * <p>
     * Executes a search for each of the known IDs. If enough returned results match the expected title the ID is probably supported.
     */
    public CheckCapsResponse checkCaps(IndexerConfig indexerConfig) {
        List<CheckCapsRequest> requests = Arrays.asList(
                new CheckCapsRequest(indexerConfig, "tvsearch", MediaIdType.TVDB, "tvdbid", "121361", Arrays.asList("Thrones", "GOT")),
                new CheckCapsRequest(indexerConfig, "tvsearch", MediaIdType.TVRAGE, "rid", "24493", Arrays.asList("Thrones", "GOT")),
                new CheckCapsRequest(indexerConfig, "tvsearch", MediaIdType.TVMAZE, "tvmazeid", "82", Arrays.asList("Thrones", "GOT")),
                new CheckCapsRequest(indexerConfig, "tvsearch", MediaIdType.TRAKT, "traktid", "1390", Arrays.asList("Thrones", "GOT")),
                new CheckCapsRequest(indexerConfig, "tvsearch", MediaIdType.TVIMDB, "imdbid", "0944947", Arrays.asList("Thrones", "GOT")),
                new CheckCapsRequest(indexerConfig, "movie", MediaIdType.TMDB, "tmdbid", "24428", Arrays.asList("Avengers", "Vengadores")),
                new CheckCapsRequest(indexerConfig, "movie", MediaIdType.IMDB, "imdbid", "0848228", Arrays.asList("Avengers", "Vengadores"))
        );

        boolean allChecked = true;
        boolean configComplete = true;
        int timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout()) + 1;
        CapsCheckLimit capsCheckLimit = CAPS_CHECK_LIMITS.stream().filter(x -> indexerConfig.getHost().toLowerCase().contains(x.urlContains)).findFirst().orElse(new CapsCheckLimit(MAX_CONNECTIONS, PAUSE_BETWEEN_CALLS, null));
        List<Callable<SingleCheckCapsResponse>> callables = new ArrayList<>();
        for (CheckCapsRequest request : requests) {
            callables.add(() -> {
                Thread.sleep(capsCheckLimit.delayInMiliseconds); //Give indexer some time to breathe
                return singleCheckCaps(request, indexerConfig);
            });
        }

        Set<SingleCheckCapsResponse> responses = new HashSet<>();
        Set<MediaIdType> supportedIds;
        String backend = null;
        ExecutorService executor = MdcThreadPoolExecutor.newWithInheritedMdc(capsCheckLimit.maxConnections);
        try {
            logger.info("Will check capabilities of indexer {} using {} concurrent connections and a delay of {}ms", indexerConfig.getName(), capsCheckLimit.maxConnections, capsCheckLimit.delayInMiliseconds);
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
                        logger.error("Error while communicating with indexer: " + e.getMessage());
                    } else {
                        logger.error("Unexpected error while checking caps", e);
                    }
                    allChecked = false;
                } catch (TimeoutException e) {
                    logger.error("Indexer {} failed to answer in {} seconds", indexerConfig.getName(), timeout);
                    allChecked = false;
                }
            }
            supportedIds = responses.stream().filter(SingleCheckCapsResponse::isSupported).map(SingleCheckCapsResponse::getIdType).collect(Collectors.toSet());
            Optional<SingleCheckCapsResponse> responseWithLimits = responses.stream().filter(x -> x.getApiMax() != null).findFirst();
            if (responseWithLimits.isPresent()) {
                logger.info("Determined an api hit limit of {} and a download limit of {}", responseWithLimits.get().apiMax, responseWithLimits.get().downloadsMax);
                if (!indexerConfig.getHitLimit().isPresent() && responseWithLimits.get().apiMax > -1) {
                    indexerConfig.setHitLimit(responseWithLimits.get().apiMax);
                }
                if (!indexerConfig.getDownloadLimit().isPresent() && responseWithLimits.get().downloadsMax > -1) {
                    indexerConfig.setDownloadLimit(responseWithLimits.get().downloadsMax);
                }
            }
            if (supportedIds.isEmpty()) {
                logger.info("Indexer {} does not support searching by any IDs", indexerConfig.getName());
            } else {
                logger.info("Indexer {} supports searching using the following IDs: {}", indexerConfig.getName(), supportedIds.stream().map(Enum::name).collect(Collectors.joining(", ")));
            }
            indexerConfig.setSupportedSearchIds(new ArrayList<>(supportedIds));

        } catch (InterruptedException e) {
            logger.error("Unexpected error while checking caps", e);
            allChecked = false;
        } finally {
            executor.shutdown();
        }

        try {
            setSupportedSearchTypesAndIndexerCategoryMapping(indexerConfig, timeout);
            if (indexerConfig.getSupportedSearchTypes().isEmpty()) {
                logger.info("Indexer {} does not support any special search types", indexerConfig.getName());
            } else {
                logger.info("Indexer {} supports the following search types: {}", indexerConfig.getName(), indexerConfig.getSupportedSearchTypes().stream().map(Enum::name).collect(Collectors.joining(", ")));
            }
        } catch (IndexerAccessException e) {
            logger.error("Error while accessing indexer: " + e.getMessage());
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
        indexerConfig.setState(configComplete ? IndexerConfig.State.ENABLED : IndexerConfig.State.DISABLED_SYSTEM);

        return new CheckCapsResponse(indexerConfig, allChecked, configComplete);
    }

    private List<CheckCapsResponse> checkCaps(CapsCheckRequest.CheckType checkType) {
        Predicate<IndexerConfig> isToBeCheckedPredicate = x ->
            x.getState() == IndexerConfig.State.ENABLED
                && (x.getSearchModuleType() == SearchModuleType.NEWZNAB || x.getSearchModuleType() == SearchModuleType.TORZNAB)
                && x.isConfigComplete()
                && (checkType == CheckType.ALL || !x.isAllCapsChecked());
        List<IndexerConfig> configsToCheck = configProvider.getBaseConfig().getIndexers().stream()
            .filter(isToBeCheckedPredicate)
            .collect(Collectors.toList());
        if (configsToCheck.isEmpty()) {
            logger.info("No indexers to check");
            return Collections.emptyList();
        }
        logger.info("Calling caps check for indexers {}", configsToCheck.stream().map(IndexerConfig::getName).collect(Collectors.joining(", ")));
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
        } finally {
            executor.shutdown();
        }
        return responses;
    }

    public void setSupportedSearchTypesAndIndexerCategoryMapping(IndexerConfig indexerConfig, int timeout) throws IndexerAccessException {
        URI uri = getBaseUri(indexerConfig).queryParam("t", "caps").build().toUri();
        Object response = indexerWebAccess.get(uri, indexerConfig);
        if (!(response instanceof CapsXmlRoot)) {
            if (response instanceof NewznabXmlRoot) {
                NewznabXmlError error = ((NewznabXmlRoot) response).getError();
                if (error != null) {
                    throw new IndexerAccessException("Indexer reported error during caps check: " + error);
                }
            }
            throw new IndexerAccessException("Unexpected indexer response");
        }
        fillIndexerConfigFromXmlCapsResponse(indexerConfig, (CapsXmlRoot) response);
    }

    static void fillIndexerConfigFromXmlCapsResponse(IndexerConfig indexerConfig, CapsXmlRoot response) {
        List<MediaIdType> supportedSearchIds = indexerConfig.getSupportedSearchIds();
        List<ActionAttribute> supportedSearchTypes = new ArrayList<>();
        if (supportedSearchIds.contains(MediaIdType.TVDB) || supportedSearchIds.contains(MediaIdType.TVRAGE) || supportedSearchIds.contains(MediaIdType.TVMAZE) || supportedSearchIds.contains(MediaIdType.TRAKT) || supportedSearchIds.contains(MediaIdType.TVIMDB)) {
            supportedSearchTypes.add(ActionAttribute.TVSEARCH);
        }
        if (supportedSearchIds.contains(MediaIdType.IMDB) || supportedSearchIds.contains(MediaIdType.TMDB)) {
            supportedSearchTypes.add(ActionAttribute.MOVIE);
        }
        CapsXmlRoot capsRoot = response;
        if (capsRoot.getSearching().getAudioSearch() != null && "yes".equals(capsRoot.getSearching().getAudioSearch().getAvailable())) {
            supportedSearchTypes.add(ActionAttribute.AUDIO);
        }
        if (capsRoot.getSearching().getBookSearch() != null && "yes".equals(capsRoot.getSearching().getBookSearch().getAvailable())) {
            supportedSearchTypes.add(ActionAttribute.BOOK);
        }
        indexerConfig.setSupportedSearchTypes(supportedSearchTypes);

        IndexerCategoryConfig categoryConfig = new IndexerCategoryConfig();
        List<CapsXmlCategory> categories = readAndConvertCategories(categoryConfig, capsRoot.getCategories().getCategories());
        setCategorySpecificMappings(categoryConfig, categories);

        indexerConfig.setCategoryMapping(categoryConfig);
    }

    private static void setCategorySpecificMappings(IndexerCategoryConfig categoryConfig, List<CapsXmlCategory> categories) {
        Optional<CapsXmlCategory> anime = categories.stream().filter(x -> x.getName().toLowerCase().contains("anime") && x.getId() / 1000 != 6).findFirst(); //Sometimes 6070 is anime as subcategory of porn, don't use that
        anime.ifPresent(capsCategory -> categoryConfig.setAnime(capsCategory.getId()));

        Optional<CapsXmlCategory> audiobook = categories.stream().filter(x -> x.getName().toLowerCase().contains("audiobook")).findFirst();
        audiobook.ifPresent(capsCategory -> categoryConfig.setAudiobook(capsCategory.getId()));

        Optional<CapsXmlCategory> comic = categories.stream().filter(x -> x.getName().toLowerCase().contains("comic")).findFirst();
        comic.ifPresent(capsCategory -> categoryConfig.setComic(capsCategory.getId()));

        Optional<CapsXmlCategory> ebook = categories.stream().filter(x -> x.getName().toLowerCase().contains("ebook") || x.getName().toLowerCase().contains("e-book")).findFirst();
        ebook.ifPresent(capsCategory -> categoryConfig.setEbook(capsCategory.getId()));

        Optional<CapsXmlCategory> magazine = categories.stream().filter(x -> x.getName().toLowerCase().contains("magazine") || x.getName().toLowerCase().contains("mags")).findFirst();
        magazine.ifPresent(capsCategory -> categoryConfig.setMagazine(capsCategory.getId()));

    }

    private static List<CapsXmlCategory> readAndConvertCategories(IndexerCategoryConfig categoryConfig, List<CapsXmlCategory> capsXmlCategories) {
        List<CapsXmlCategory> categories = new ArrayList<>(capsXmlCategories);
        List<MainCategory> configMainCategories = new ArrayList<>();
        for (CapsXmlCategory category : capsXmlCategories) {
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
        Xml response = null;
        try {
            response = indexerWebAccess.get(uri, indexerConfig);
        } catch (IndexerAccessException e) {
            if (e.getCause() instanceof IndexerWebAccess.HydraUnmarshallingFailureException) {
                String indexerResponse = ((IndexerWebAccess.HydraUnmarshallingFailureException) e.getCause()).getResponse();
                if (indexerResponse != null && indexerResponse.toLowerCase().contains("function not available")) {
                    return new SingleCheckCapsResponse(request.getKey(), request.getIdType(), false, null, null, null);
                }
            }
            throw e;
        }
        searchModuleProvider.registerApiHitLimits(indexerConfig.getName(), 1);

        if (response instanceof NewznabXmlError) {
            String errorDescription = ((NewznabXmlError) response).getDescription();
            if (errorDescription.toLowerCase().contains("function not available") || errorDescription.toLowerCase().contains("does not support the requested query")) {
                logger.error("Indexer {} reports that it doesn't support the ID type {}", request.indexerConfig.getName(), request.getIdType());
                eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(), "Doesn't support " + request.getIdType()));
                return new SingleCheckCapsResponse(request.getKey(), request.getIdType(), false, null, null, null);
            }
            logger.debug("RSS error from indexer {}: {}", request.indexerConfig.getName(), errorDescription);
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(), "RSS error from indexer: " + errorDescription));
            throw new IndexerAccessException("RSS error from indexer: " + errorDescription);
        }
        NewznabXmlRoot rssRoot = (NewznabXmlRoot) response;

        if (rssRoot.getRssChannel().getItems().isEmpty()) {
            logger.info("Indexer {} probably doesn't support the ID type {}. It returned no results.", request.indexerConfig.getName(), request.getIdType());
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(), "Probably doesn't support " + request.getIdType()));
            return new SingleCheckCapsResponse(request.getKey(), request.getIdType(), false, rssRoot.getRssChannel().getGenerator(), null, null);
        }
        long countCorrectResults = rssRoot.getRssChannel().getItems().stream().filter(x -> request.getTitleExpectedToContain().stream().anyMatch(y -> x.getTitle().toLowerCase().contains(y.toLowerCase()))).count();
        float percentCorrect = (100 * countCorrectResults) / (float) rssRoot.getRssChannel().getItems().size();
        boolean supported = percentCorrect >= ID_THRESHOLD_PERCENT;
        Integer maxApi = null;
        Integer maxDownloads = null;
        NewznabXmlApilimits apiLimits = rssRoot.getRssChannel().getApiLimits();
        if (apiLimits != null) {
            maxApi = apiLimits.getApiMax();
            maxDownloads = apiLimits.getGrabMax();
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(), "Determined API limit " + maxApi + " and download limit " + maxDownloads));
            logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Max API hits: {}. Max downloads: {}", indexerConfig.getName(), maxApi, maxDownloads);
        } else {
            logger.debug(LoggingMarkers.LIMITS, "Indexer {}. No limits provided in response.", indexerConfig.getName());
        }
        if (supported) {
            logger.info("Indexer {} probably supports the ID type {}. {}% of results were correct.", request.indexerConfig.getName(), request.getIdType(), percentCorrect);
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(), "Probably supports " + request.getIdType()));

            return new SingleCheckCapsResponse(request.getKey(), request.getIdType(), true, rssRoot.getRssChannel().getGenerator(), maxApi, maxDownloads);
        } else {
            logger.info("Indexer {} probably doesn't support the ID type {}. {}% of results were correct.", request.indexerConfig.getName(), request.getIdType(), percentCorrect);
            eventPublisher.publishEvent(new CheckerEvent(indexerConfig.getName(), "Probably doesn't support " + request.getIdType()));
            return new SingleCheckCapsResponse(request.getKey(), request.getIdType(), false, rssRoot.getRssChannel().getGenerator(), maxApi, maxDownloads);
        }
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CheckerEvent {
        private String indexerName;
        private String message;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ConnectionCheckResponse {
        private String indexerName;
        private String message;
    }


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    private static class CheckCapsRequest {
        private IndexerConfig indexerConfig;
        private String tMode;
        private MediaIdType idType;
        private String key;
        private String value;
        private List<String> titleExpectedToContain;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    private static class SingleCheckCapsResponse {
        private String key;
        private MediaIdType idType;
        private boolean supported;
        private String backend;
        private Integer apiMax;
        private Integer downloadsMax;
    }

    @AllArgsConstructor
    private static class CapsCheckLimit {
        private int maxConnections;
        private int delayInMiliseconds;
        private String urlContains;
    }


}
