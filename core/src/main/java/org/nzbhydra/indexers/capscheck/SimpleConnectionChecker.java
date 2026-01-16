

package org.nzbhydra.indexers.capscheck;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;

@Component
public class SimpleConnectionChecker {

    @Autowired
    protected IndexerWebAccess indexerWebAccess;
    private static final Logger logger = LoggerFactory.getLogger(SimpleConnectionChecker.class);

    public GenericResponse checkConnection(IndexerConfig config) {
        try {
            indexerWebAccess.get(new URI(config.getHost()), config, String.class);
        } catch (IndexerAccessException | URISyntaxException e) {
            logger.warn("Connection check with indexer {} failed. Error message: {}", config.getName(), e.getMessage());
            return GenericResponse.notOk(e.getMessage());
        }
        return GenericResponse.ok();
    }
}
