

package org.nzbhydra.indexers;

import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class IndexerStatusesCleanupTask {
    private static final Logger logger = LoggerFactory.getLogger(IndexerStatusesCleanupTask.class);

    private static final long MINUTE = 1000 * 60;

    private ConfigProvider configProvider;
    ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();
    private BaseConfigHandler baseConfigHandler;

    @Autowired
    public IndexerStatusesCleanupTask(ConfigProvider configProvider, BaseConfigHandler baseConfigHandler) {
        this.configProvider = configProvider;
        this.baseConfigHandler = baseConfigHandler;
    }

    @HydraTask(configId = "cleanUpIndexerStatuses", name = "Clean up indexer statuses", interval = MINUTE)
    public void cleanup() {
        boolean anyChanges = false;
        for (IndexerConfig config : configProvider.getBaseConfig().getIndexers()) {
            if (config.getState() == IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY && config.getDisabledUntil() != null && Instant.ofEpochMilli(config.getDisabledUntil()).isBefore(Instant.now())) {
                //Do not reset the level. When the indexer is called the next time (when disabledUntil is in the past)
                //and an error occurs the level is increased and the indexer gets disabled for a longer time
                logger.debug("Setting indexer {} back to enabled after having been temporarily disabled until {}", config.getName(), Instant.ofEpochMilli(config.getDisabledUntil()));
                config.setState(IndexerConfig.State.ENABLED);
                config.setDisabledUntil(null);
                config.setLastError(null);
                anyChanges = true;
            }
        }
        if (anyChanges) {
            baseConfigHandler.save(false);
        }
    }
}
