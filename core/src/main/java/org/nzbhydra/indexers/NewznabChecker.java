package org.nzbhydra.indexers;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerCategoryConfig;
import org.nzbhydra.config.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.IndexerCategoryConfig.SubCategory;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mapping.newznab.caps.CapsCategory;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.stream.Collectors;

@Component
public class NewznabChecker {

    private static final Logger logger = LoggerFactory.getLogger(NewznabChecker.class);
    public static final int MAX_CONNECTIONS = 2;
    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected IndexerWebAccess indexerWebAccess;


    protected UriComponentsBuilder getBaseUri(IndexerConfig indexerConfig) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(indexerConfig.getHost());
        return builder.path("/api").queryParam("apikey", indexerConfig.getApiKey());
    }

    public GenericResponse checkConnection(IndexerConfig indexerConfig) {
        Xml xmlResponse;
        try {
            xmlResponse = indexerWebAccess.get(getBaseUri(indexerConfig).queryParam("t", "tvsearch").build().toUri(), Xml.class, indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout()));
            if (xmlResponse instanceof RssError) {
                logger.warn("Connection check with indexer {} failed with message: ", indexerConfig.getName(), ((RssError) xmlResponse).getDescription());
                return GenericResponse.notOk("Indexer returned message: " + ((RssError) xmlResponse).getDescription());
            }
            RssRoot rssRoot = (RssRoot) xmlResponse;
            if (!rssRoot.getRssChannel().getItems().isEmpty()) {
                logger.info("Connection to indexer {} successful", indexerConfig.getName());
                return GenericResponse.ok();
            } else {
                logger.warn("Connection to indexer {} successful but search did not return any results", indexerConfig.getName());
                return GenericResponse.notOk("Indexer did not return any results");
            }
        } catch (IndexerAccessException e) {
            logger.warn("Connection check with indexer {} failed with message: ", indexerConfig.getName(), e.getMessage());
            return GenericResponse.notOk(e.getMessage());
        }
    }


    /**
     * Attempts to determine which search IDs like IMDB or TVDB ID are supported by the indexer specified in the config.
     * <p>
     * Executes a search for each of the known IDs. If enough returned results match the expected title the ID is probably supported.
     */
    public CheckCapsRespone checkCaps(IndexerConfig indexerConfig) {
        List<CheckCapsRequest> requests = Arrays.asList(
                new CheckCapsRequest(indexerConfig, "tvsearch", "tvdbid", "121361", "Thrones"),
                new CheckCapsRequest(indexerConfig, "tvsearch", "rid", "24493", "Thrones"),
                new CheckCapsRequest(indexerConfig, "tvsearch", "tvmazeid", "82", "Thrones"),
                new CheckCapsRequest(indexerConfig, "tvsearch", "traktid", "1390", "Thrones"),
                new CheckCapsRequest(indexerConfig, "movie", "tmdbid", "1399", "Avengers"),
                new CheckCapsRequest(indexerConfig, "movie", "imdbid", "0848228", "Avengers")
        );
        boolean allChecked = true;
        Integer timeout = indexerConfig.getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout()); //TODO Perhaps ignore timeout at ths point
        List<Callable<SingleCheckCapsResponse>> callables = requests.stream().<Callable<SingleCheckCapsResponse>>map(checkCapsRequest -> () -> singleCheckCaps(checkCapsRequest, timeout)).collect(Collectors.toList());
        Set<SingleCheckCapsResponse> responses = new HashSet<>();
        Set<IdType> supportedIds = Collections.emptySet();
        Set<ActionAttribute> supportedTypes = new HashSet<>();
        String backend = null;
        try {
            logger.info("Will check capabilities of indexer {} using {} concurrent connections", indexerConfig.getName(), MAX_CONNECTIONS);
            ExecutorService executor = Executors.newFixedThreadPool(MAX_CONNECTIONS);
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
                        logger.error("Error while communicating with indexer", e);
                    } else {
                        logger.error("Unexpected error while checking caps", e);
                    }
                    allChecked = false;
                } catch (TimeoutException e) {
                    logger.error("Indexer failed to answer in {} seconds", timeout);
                    allChecked = false;
                }
            }
            supportedIds = responses.stream().filter(SingleCheckCapsResponse::isSupported).map(x -> Newznab.paramValueToIdMap.get(x.getKey())).collect(Collectors.toSet());
            if (supportedIds.isEmpty()) {
                logger.info("The indexer does not support searching by any IDs");
            } else {
                logger.info("The indexer supports searching using the following IDs: " + supportedIds.stream().map(Enum::name).collect(Collectors.joining(", ")));
            }

        } catch (InterruptedException e) {
            logger.error("Unexpected error while checking caps", e);
            allChecked = false;
        }

        IndexerCategoryConfig indexerCategoryConfig = new IndexerCategoryConfig();
        try {
            indexerCategoryConfig = getIndexerCategoryConfig(indexerConfig, supportedTypes, supportedIds, timeout);
        } catch (IndexerAccessException e) {
            logger.error("Error while accessing indexer", e);
        }

        BackendType backendType;
        try {
            backendType = BackendType.valueOf(backend.toUpperCase());
            logger.info("Indexer uses backend type {}", backendType);
        } catch (IllegalArgumentException | NullPointerException e) {
            logger.error("Indexer reported unknown backend type {}. Will use newznab for now. Please report this.", backend);
            backendType = BackendType.NEWZNAB;
        }

        //TODO Return response that says if an error occured but still return any found IDs and types
        return new CheckCapsRespone(supportedIds, supportedTypes, indexerCategoryConfig, backendType, allChecked);
    }

    protected IndexerCategoryConfig getIndexerCategoryConfig(IndexerConfig indexerConfig, Set<ActionAttribute> supportedTypes, Set<IdType> supportedIds, int timeout) throws IndexerAccessException {
        if (supportedIds.contains(IdType.TVDB) || supportedIds.contains(IdType.TVRAGE) || supportedIds.contains(IdType.TVMAZE) || supportedIds.contains(IdType.TRAKT)) {
            supportedTypes.add(ActionAttribute.TVSEARCH);
        }
        if (supportedIds.contains(IdType.IMDB) || supportedIds.contains(IdType.TMDB)) {
            supportedTypes.add(ActionAttribute.MOVIE);
        }
        URI uri = getBaseUri(indexerConfig).queryParam("t", "caps").build().toUri();
        CapsRoot capsRoot = indexerWebAccess.get(uri, CapsRoot.class, timeout);
        if (capsRoot.getSearching().getAudioSearch() != null) {
            supportedTypes.add(ActionAttribute.AUDIO);
        }
        if (capsRoot.getSearching().getBookSearch() != null) {
            supportedTypes.add(ActionAttribute.BOOK);
        }

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
    }

    private List<CapsCategory> readAndConvertCategories(CapsRoot capsRoot, IndexerCategoryConfig categoryConfig) {
        List<CapsCategory> categories = new ArrayList<>(capsRoot.getCategories().getCategories());
        List<MainCategory> configMainCategories = new ArrayList<>();
        for (CapsCategory category : capsRoot.getCategories().getCategories()) {
            categories.addAll(category.getSubCategories());
            List<SubCategory> configSubcats = category.getSubCategories().stream().map(x -> new SubCategory(x.getId(), x.getName())).collect(Collectors.toList());
            configMainCategories.add(new MainCategory(category.getId(), category.getName(), configSubcats));
        }
        categoryConfig.setCategories(configMainCategories);
        return categories;
    }

    private SingleCheckCapsResponse singleCheckCaps(CheckCapsRequest request, int timeout) throws IndexerAccessException {
        URI uri = getBaseUri(request.getIndexerConfig()).queryParam("t", request.getTMode()).queryParam(request.getKey(), request.getValue()).build().toUri();
        RssRoot rssRoot = indexerWebAccess.get(uri, RssRoot.class, timeout);
        if (rssRoot.getRssChannel().getItems().isEmpty()) {
            logger.info("Indexer returned no results when searching with ID {}", request.getKey());
            return new SingleCheckCapsResponse(request.getKey(), false, rssRoot.getRssChannel().getGenerator());
        }
        long countCorrectResults = rssRoot.getRssChannel().getItems().stream().filter(x -> x.getTitle().toLowerCase().contains(request.getTitleExpectedToContain().toLowerCase())).count();
        float percentCorrect = (100 * countCorrectResults) / rssRoot.getRssChannel().getItems().size();
        boolean supported = percentCorrect > 90;
        if (supported) {
            logger.info("{}% of results using ID type {} were correct. The indexer probably supports this ID.", percentCorrect, request.getKey());
            return new SingleCheckCapsResponse(request.getKey(), true, rssRoot.getRssChannel().getGenerator());
        } else {
            logger.info("{}% of results using ID type {} were correct. The indexer probably doesn't support this ID.", percentCorrect, request.getKey());
            return new SingleCheckCapsResponse(request.getKey(), false, rssRoot.getRssChannel().getGenerator());
        }
    }


    @Data
    @AllArgsConstructor
    private class CheckCapsRequest {
        private IndexerConfig indexerConfig;
        private String tMode;
        private String key;
        private String value;
        private String titleExpectedToContain;
    }

    @Data
    @AllArgsConstructor
    private class SingleCheckCapsResponse {
        private String key;
        private boolean supported;
        private String backend;
    }

    @Data
    @AllArgsConstructor
    public class CheckCapsRespone {
        private Set<IdType> supportedSearchIds;
        private Set<ActionAttribute> supportedSearchTypes;
        private IndexerCategoryConfig categoryConfig;
        private BackendType backend;
        private boolean allChecked;
    }


}
