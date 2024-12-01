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

package org.nzbhydra;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.hydraconfigure.DownloaderConfigurer;
import org.nzbhydra.hydraconfigure.IndexerConfigurer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BeforeAll {

    private static final Logger logger = LoggerFactory.getLogger(BeforeAll.class);

    @Autowired
    private ConfigManager configManager;
    @Autowired
    private IndexerConfigurer indexerConfigurer;
    @Autowired
    private DownloaderConfigurer downloaderConfigurer;

    @Autowired
    private ConfigurableEnvironment configurableEnvironment;

    @PostConstruct
    public void init() throws Exception {
        final List<MapPropertySource> propertySources = configurableEnvironment.getPropertySources()
            .stream()
            .filter(x -> x instanceof MapPropertySource)
            .map(x -> (MapPropertySource) x).toList();
        for (MapPropertySource source : propertySources) {
            logger.info("Property source: {}", source.getName());
            source.getSource().forEach((key, value) -> logger.info("{}: {}", key, value));
        }

        final BaseConfig config = configManager.getCurrentConfig();
        config.getMain().setApiKey("apikey");
        config.getMain().getLogging().setLogIpAddresses(true);
        config.getMain().getLogging().setLogUsername(true);
        config.getMain().getLogging().setConsolelevel("DEBUG");
        config.getMain().getLogging().setLogfilelevel("DEBUG");
        configManager.setConfig(config);
        indexerConfigurer.configureTwoMockIndexers();
        downloaderConfigurer.configureSabnzbdMock();
    }
}
