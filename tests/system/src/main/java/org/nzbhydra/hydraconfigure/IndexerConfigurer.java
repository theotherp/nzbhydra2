/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.hydraconfigure;

import org.nzbhydra.HydraClient;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;

@Component
public class IndexerConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(IndexerConfigurer.class);
    @Autowired
    private ConfigManager configManager;

    @Autowired
    private HydraClient hydraClient;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    public void configureTwoMockIndexers() {
        logger.info("Configuring two indexers using host " + mockUrl);
        final BaseConfig config = configManager.getCurrentConfig();
        config.getIndexers().clear();
        for (int i = 1; i < 4; i++) {
            IndexerConfig indexerConfig = getIndexerConfig("Mock" + i, String.valueOf(i));

            config.getIndexers().add(indexerConfig);
        }

        configManager.setConfig(config);

    }

    public IndexerConfig getIndexerConfig(String name, String apikey) {
        IndexerConfig indexerConfig = new IndexerConfig();

        indexerConfig.setApiKey(apikey);
        indexerConfig.setName(name);
        indexerConfig.setHost(mockUrl);
        indexerConfig.setAllCapsChecked(true);
        indexerConfig.setSupportedSearchIds(Arrays.asList(MediaIdType.IMDB, MediaIdType.TVMAZE));
        indexerConfig.setBackend(BackendType.NEWZNAB);
        final IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
        categoryMapping.setAnime(9090);
        categoryMapping.setEbook(7020);
        categoryMapping.setCategories(Arrays.asList(new IndexerCategoryConfig.MainCategory(2000, "Movies", Collections.singletonList(new IndexerCategoryConfig.SubCategory(2030, "Movies HD")))));
        indexerConfig.setCategoryMapping(categoryMapping);
        return indexerConfig;
    }
}
