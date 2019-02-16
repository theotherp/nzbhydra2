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

package org.nzbhydra.config.indexer;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Is called to synchroize indexer state related data between the database and the config
 */
@Component
public class IndexerConfigSynchronizer {
    private static final Logger logger = LoggerFactory.getLogger(IndexerConfigSynchronizer.class);

    @Autowired
    private IndexerRepository indexerRepository;

    public BaseConfig synchronizeFromDatabase(BaseConfig baseConfig) {
        logger.debug("Synchronizing indexer state information from database");
        baseConfig.getIndexers().forEach(indexerConfig -> {
            IndexerEntity indexerEntity = indexerRepository.findByName(indexerConfig.getName());
            if (indexerEntity == null) {
                logger.debug("Indexer with name {} found in config but not in database");
                return;
            }
            indexerConfig.setState(indexerEntity.getState());
            indexerConfig.setDisabledUntil(indexerEntity.getDisabledUntil());
            indexerConfig.setLastError(indexerEntity.getLastError());
            indexerConfig.setDisabledLevel(indexerEntity.getDisabledLevel());
        });
        return baseConfig;
    }

    public void synchronizeFromConfig(BaseConfig baseConfig) {
        logger.debug("Synchronizing indexer state information from config");
        for (IndexerConfig indexerConfig : baseConfig.getIndexers()) {
            IndexerEntity indexerEntity = indexerRepository.findByName(indexerConfig.getName());
            if (indexerEntity == null) {
                logger.debug("Indexer with name {} found in config but not in database");
                continue;
            }
            indexerEntity.setState(indexerConfig.getState());
            indexerEntity.setDisabledUntil(indexerConfig.getDisabledUntil());
            indexerEntity.setLastError(indexerConfig.getLastError());
            indexerEntity.setDisabledLevel(indexerConfig.getDisabledLevel());
            indexerRepository.save(indexerEntity);
        }
    }

}
