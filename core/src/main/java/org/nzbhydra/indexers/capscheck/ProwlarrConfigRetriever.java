

package org.nzbhydra.indexers.capscheck;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.webaccess.WebAccess;
import org.nzbhydra.webaccess.WebAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
public class ProwlarrConfigRetriever {

    private static final Logger logger = LoggerFactory.getLogger(ProwlarrConfigRetriever.class);

    @Autowired
    private WebAccess webAccess;

    public List<IndexerConfig> retrieveIndexers(IndexerConfig prowlarrConfig) throws Exception {
        String host = prowlarrConfig.getHost();
        if (host.endsWith("/")) {
            host = host.substring(0, host.length() - 1);
        }

        final URI uri = URI.create(host + "/api/v1/indexer?apikey=" + prowlarrConfig.getApiKey());
        logger.info("Getting configured indexers from Prowlarr at {}", host);

        List<ProwlarrIndexer> prowlarrIndexers;
        try {
            prowlarrIndexers = webAccess.callUrl(uri.toString(), new TypeReference<>() {
            });
        } catch (WebAccessException e) {
            String message = "Error accessing Prowlarr: " + e.getMessage();
            logger.error(message);
            throw new IndexerAccessException(message, e);
        }

        List<IndexerConfig> configs = new ArrayList<>();
        for (ProwlarrIndexer indexer : prowlarrIndexers) {
            if (!indexer.enable) {
                logger.debug("Skipping disabled Prowlarr indexer: {}", indexer.name);
                continue;
            }

            if (!"usenet".equalsIgnoreCase(indexer.protocol) && !"torrent".equalsIgnoreCase(indexer.protocol)) {
                logger.debug("Skipping Prowlarr indexer with unsupported protocol {}: {}", indexer.protocol, indexer.name);
                continue;
            }

            IndexerConfig currentConfig = Jackson.JSON_MAPPER.readValue(Jackson.JSON_MAPPER.writeValueAsString(prowlarrConfig), IndexerConfig.class);

            // URL format: http://prowlarr:port/{indexer_id}
            currentConfig.setHost(host + "/" + indexer.id);
            currentConfig.setApiKey(prowlarrConfig.getApiKey());
            currentConfig.setConfigComplete(true);
            currentConfig.setAllCapsChecked(true);
            currentConfig.setName(indexer.name + " (Prowlarr)");

            if ("usenet".equalsIgnoreCase(indexer.protocol)) {
                currentConfig.setSearchModuleType(SearchModuleType.NEWZNAB);
                logger.info("Found enabled Usenet indexer {} at Prowlarr, adding as Newznab", indexer.name);
            } else {
                currentConfig.setSearchModuleType(SearchModuleType.TORZNAB);
                logger.info("Found enabled Torrent indexer {} at Prowlarr, adding as Torznab", indexer.name);
            }

            configs.add(currentConfig);
            logger.debug("Determined config: {}", currentConfig);
        }

        return configs;
    }

    /**
     * Extracts the Prowlarr indexer ID from a host URL like "http://prowlarr:9696/42".
     */
    public static String extractProwlarrId(String host) {
        return StringUtils.substringAfterLast(host, "/");
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    @ReflectionMarker
    public static class ProwlarrIndexer {
        private int id;
        private String name;
        private String protocol;
        private boolean enable;
    }
}
