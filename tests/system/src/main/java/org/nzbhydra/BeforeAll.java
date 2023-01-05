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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class BeforeAll {

    @Autowired
    private ConfigManager configManager;
    @Autowired
    private IndexerConfigurer indexerConfigurer;
    @Autowired
    private DownloaderConfigurer downloaderConfigurer;

    @PostConstruct
    public void init() throws Exception{
        final BaseConfig config = configManager.getCurrentConfig();
        config.getMain().setApiKey("apikey");
        configManager.setConfig(config);
        indexerConfigurer.configureTwoMockIndexers();
        downloaderConfigurer.configureSabnzbdMock();
        //Wait for changes to be loaded
        Thread.sleep(1500);
    }
}
