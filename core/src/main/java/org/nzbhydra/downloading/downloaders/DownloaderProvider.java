/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;

@Component
public class DownloaderProvider implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(DownloaderProvider.class);
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private DownloaderInstatiator downloaderInstatiator;


    private final HashMap<String, Downloader> downloadersMap = new HashMap<>();

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) throws Exception {
        afterPropertiesSet();
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        final BaseConfig baseConfig = configProvider.getBaseConfig();
        if (baseConfig.getDownloading().getDownloaders() != null) {
            List<DownloaderConfig> downloaderConfigs = baseConfig.getDownloading().getDownloaders();
            downloadersMap.clear();
            logger.info("Loading downloaders");
            for (DownloaderConfig downloaderConfig : downloaderConfigs) {
                logger.info("Initializing downloader {}", downloaderConfig.getName());
                try {
                    Downloader downloader = downloaderInstatiator.instantiate(downloaderConfig.getDownloaderType());
                    downloader.initialize(downloaderConfig);
                    downloadersMap.put(downloaderConfig.getName().toLowerCase(), downloader);
                } catch (Exception e) {
                    logger.error("Error while initializing downloader", e);
                }
            }
            logger.info("Finished initializing active downloaders");
            if (downloadersMap.isEmpty()) {
                logger.info("No downloaders configured");
            }
        } else {
            logger.error("Configuration incomplete, no downloaders found");
        }
    }

    public GenericResponse checkConnection(DownloaderConfig downloaderConfig) {
        Downloader downloader = downloaderInstatiator.instantiate(downloaderConfig.getDownloaderType());
        downloader.initialize(downloaderConfig);
        return downloader.checkConnection();
    }

    public Collection<Downloader> getAllDownloaders() {
        return downloadersMap.values();
    }

    public Downloader getDownloaderByName(String downloaderName) {
        if (!downloadersMap.containsKey(downloaderName.toLowerCase())) {
            throw new IllegalArgumentException("Unable to find downloader with name " + downloaderName);
        }
        return downloadersMap.get(downloaderName.toLowerCase());
    }

}
