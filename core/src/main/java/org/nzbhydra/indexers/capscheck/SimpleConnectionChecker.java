package org.nzbhydra.indexers.capscheck;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.validation.StoredRecordMatcher;
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
    @Autowired
    protected ConfigProvider configProvider;
    private static final Logger logger = LoggerFactory.getLogger(SimpleConnectionChecker.class);

    public GenericResponse checkConnection(IndexerConfig config) {
        // The check runs before the config is saved, so saved secrets arrive as unchanged markers. They are replaced by
        // the values stored for the same indexer, and without those the indexer is not contacted at all.
        final StoredRecordMatcher.Resolution resolution = StoredRecordMatcher.resolveUnchangedMarkers(config, configProvider.getBaseConfig().getIndexers());
        if (!resolution.isComplete()) {
            logger.warn("Not checking connection to indexer {} because its saved credentials could not be found", config.getName());
            return GenericResponse.notOk(resolution.getMessage("indexer", config.getName()));
        }
        try {
            indexerWebAccess.get(new URI(config.getHost()), config, String.class);
        } catch (IndexerAccessException | URISyntaxException e) {
            logger.warn("Connection check with indexer {} failed. Error message: {}", config.getName(), e.getMessage());
            return GenericResponse.notOk(e.getMessage());
        }
        return GenericResponse.ok();
    }
}
