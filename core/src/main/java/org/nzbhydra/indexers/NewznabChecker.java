package org.nzbhydra.indexers;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
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
    @Autowired
    protected BaseConfig baseConfig;
    @Autowired
    protected IndexerWebAccess indexerWebAccess;


    protected UriComponentsBuilder getBaseUri(IndexerConfig indexerConfig) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(indexerConfig.getHost());
        return builder.path("/api").queryParam("apikey", indexerConfig.getApikey());
    }

    public GenericResponse checkConnection(IndexerConfig indexerConfig) {
        Xml xmlResponse;
        try {
            xmlResponse = indexerWebAccess.get(getBaseUri(indexerConfig).queryParam("t", "tvsearch").toUriString(), Xml.class, indexerConfig.getTimeout().orElse(baseConfig.getSearching().getTimeout()));
            if (xmlResponse instanceof RssError) {
                return new GenericResponse(false, "Indexer returned message: " + ((RssError) xmlResponse).getDescription());
            }
            RssRoot rssRoot = (RssRoot) xmlResponse;
            if (!rssRoot.getRssChannel().getItems().isEmpty()) {
                return new GenericResponse(true, null);
            } else {
                return new GenericResponse(false, "Indexer did not return any results");
            }
        } catch (IndexerAccessException e) {
            return new GenericResponse(false, e.getMessage());
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
        Integer timeout = indexerConfig.getTimeout().orElse(baseConfig.getSearching().getTimeout()); //TODO Perhaps ignore timeout at ths point
        List<Callable<SingleCheckCapsResponse>> callables = requests.stream().<Callable<SingleCheckCapsResponse>>map(checkCapsRequest -> () -> singleCheckCaps(checkCapsRequest, timeout)).collect(Collectors.toList());
        Set<SingleCheckCapsResponse> responses = new HashSet<>();
        Set<IdType> supportedIds = Collections.emptySet();
        Set<ActionAttribute> supportedTypes = new HashSet<>();
        String backend = null;
        try {
            ExecutorService executor = Executors.newFixedThreadPool(requests.size());//TODO Perhaps limit this to not hammer the indexer too much
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

        try {
            readAndAnalyzeCapsPage(indexerConfig, supportedTypes, supportedIds, timeout);
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
        return new CheckCapsRespone(supportedIds, supportedTypes, backendType, allChecked);
    }

    private void readAndAnalyzeCapsPage(IndexerConfig indexerConfig, Set<ActionAttribute> supportedTypes, Set<IdType> supportedIds, int timeout) throws IndexerAccessException {
        if (supportedIds.contains(IdType.TVDB) || supportedIds.contains(IdType.TVRAGE) || supportedIds.contains(IdType.TVMAZE) || supportedIds.contains(IdType.TRAKT)) {
            supportedTypes.add(ActionAttribute.TVSEARCH);
        }
        if (supportedIds.contains(IdType.IMDB) || supportedIds.contains(IdType.TMDB)) {
            supportedTypes.add(ActionAttribute.MOVIE);
        }
        String uri = getBaseUri(indexerConfig).queryParam("t", "caps").build().toUriString();
        CapsRoot capsRoot = indexerWebAccess.get(uri, CapsRoot.class, timeout);
        if (capsRoot.getSearching().getAudioSearch() != null) {
            supportedTypes.add(ActionAttribute.AUDIO);
        }
        if (capsRoot.getSearching().getBookSearch() != null) {
            supportedTypes.add(ActionAttribute.BOOK);
        }
    }

    private SingleCheckCapsResponse singleCheckCaps(CheckCapsRequest request, int timeout) throws IndexerAccessException {
        String uri = getBaseUri(request.getIndexerConfig()).queryParam("t", request.getTMode()).queryParam(request.getKey(), request.getValue()).build().toUriString();
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
        private Set<IdType> supportedIds;
        private Set<ActionAttribute> supportedTypes;
        private BackendType backend;
        private boolean allChecked;
    }


}
