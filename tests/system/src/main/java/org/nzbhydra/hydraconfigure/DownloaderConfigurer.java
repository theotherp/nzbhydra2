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
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.DownloaderType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
public class DownloaderConfigurer {

    @Autowired
    private ConfigManager configManager;

    @Autowired
    private HydraClient hydraClient;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    public void configureSabnzbdMock() {
        final BaseConfig config = configManager.getCurrentConfig();
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setApiKey("apikey");
        downloaderConfig.setName("Mock");
        downloaderConfig.setUrl(mockUrl + "/sabnzbd");
        downloaderConfig.setDownloaderType(DownloaderType.SABNZBD);
        downloaderConfig.setEnabled(true);

        config.getDownloading().setDownloaders(Collections.singletonList(downloaderConfig));
        configManager.setConfig(config);

    }
}
