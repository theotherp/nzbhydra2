package org.nzbhydra.indexers;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
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
import java.util.stream.Collectors;

@Component
public class NewznabChecker {

    //TODO: Find out categories and backend

    private static final Logger logger = LoggerFactory.getLogger(NewznabChecker.class);

    @Autowired
    protected RestTemplate restTemplate;


    protected UriComponentsBuilder getBaseUri(IndexerConfig indexerConfig) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(indexerConfig.getHost());
        return builder.path("/api").queryParam("apikey", indexerConfig.getApikey());
    }


    public GenericResponse checkConnection(IndexerConfig indexerConfig) {
        Xml xmlResponse;
        try {
            xmlResponse = restTemplate.getForObject(getBaseUri(indexerConfig).queryParam("t", "tvsearch").toUriString(), Xml.class);
            if (xmlResponse instanceof RssError) {
                return new GenericResponse(false, "Indexer returned message: " + ((RssError) xmlResponse).getDescription());
            }
            RssRoot rssRoot = (RssRoot) xmlResponse;
            if (!rssRoot.getRssChannel().getItems().isEmpty()) {
                return new GenericResponse(true, null);
            } else {
                return new GenericResponse(false, "Indexer did not return any results");
            }
        } catch (RestClientException e) {
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

        List<Callable<SingleCheckCapsResponse>> callables = requests.stream().<Callable<SingleCheckCapsResponse>>map(checkCapsRequest -> () -> singleCheckCaps(checkCapsRequest)).collect(Collectors.toList());
        Set<SingleCheckCapsResponse> responses = new HashSet<>();
        Set<IdType> supportedIds = Collections.emptySet();
        String backend = null;
        try {
            ExecutorService executor = Executors.newFixedThreadPool(requests.size());
            List<Future<SingleCheckCapsResponse>> futures = executor.invokeAll(callables);
            for (Future<SingleCheckCapsResponse> future : futures) {
                try {
                    SingleCheckCapsResponse response = future.get();
                    if (response.getBackend() != null) {
                        backend = response.getBackend();
                    }
                    responses.add(response);
                } catch (ExecutionException e) {
                    logger.error("Unexpected error while checking caps", e);
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
        }

        return new CheckCapsRespone(supportedIds, Collections.emptySet(), backend); //TODO: Check types
    }

    private SingleCheckCapsResponse singleCheckCaps(CheckCapsRequest request) {
        String uri = getBaseUri(request.getIndexerConfig()).queryParam("t", request.getTMode()).queryParam(request.getKey(), request.getValue()).build().toUriString();
        RssRoot rssRoot = restTemplate.getForObject(uri, RssRoot.class);
        if (rssRoot.getRssChannel().getItems().isEmpty()) {
            logger.info("Indexer returned no results when searching with ID {}", request.getKey());
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
        private Set<String> supportedTypes;
        private String backend;
    }


}
