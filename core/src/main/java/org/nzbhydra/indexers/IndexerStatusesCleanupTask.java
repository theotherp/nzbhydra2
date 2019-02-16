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

package org.nzbhydra.indexers;

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

    @Autowired
    public IndexerStatusesCleanupTask(ConfigProvider configProvider) {
        this.configProvider = configProvider;
    }

    @HydraTask(configId = "cleanUpIndexerStatuses", name = "Clean up indexer statuses", interval = MINUTE)
    public void cleanup() {
        for (IndexerConfig config : configProvider.getBaseConfig().getIndexers()) {
            if (config.getState() == IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY && config.getDisabledUntil() != null && Instant.ofEpochMilli(config.getDisabledUntil()).isBefore(Instant.now())) {
                //Do not reset the level. When the indexer is called the next time (when disabledUntil is in the past)
                //and an error occurs the level is increased and the indexer gets disabled for a longer time
                logger.debug("Setting indexer {} back to enabled after having been temporarily disabled until {}", config.getName(), Instant.ofEpochMilli(config.getDisabledUntil()));
                config.setState(IndexerConfig.State.ENABLED);
                config.setDisabledUntil(null);
                config.setLastError(null);
            }
        }
        configProvider.getBaseConfig().save(false);
    }
}
