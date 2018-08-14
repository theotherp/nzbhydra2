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

package org.nzbhydra.downloading.downloaders;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.DownloaderType;
import org.nzbhydra.downloading.downloaders.nzbget.NzbGet;
import org.nzbhydra.downloading.downloaders.sabnzbd.Sabnzbd;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class DownloaderProvider implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(DownloaderProvider.class);

    private static final Map<DownloaderType, Class<? extends Downloader>> downloaderClasses = new HashMap<>();

    static {
        downloaderClasses.put(DownloaderType.SABNZBD, Sabnzbd.class);
        downloaderClasses.put(DownloaderType.NZBGET, NzbGet.class);
    }

    @Autowired
    private AutowireCapableBeanFactory beanFactory;
    @Autowired
    private BaseConfig baseConfig;


    private HashMap<String, Downloader> downloadersMap = new HashMap<>();

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) throws Exception {
        baseConfig = configChangedEvent.getNewConfig();
        afterPropertiesSet();
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        if (baseConfig.getDownloading().getDownloaders() != null) {
            List<DownloaderConfig> downloaderConfigs = baseConfig.getDownloading().getDownloaders();
            downloadersMap.clear();
            logger.info("Loading downloaders");
            for (DownloaderConfig downloaderConfig : downloaderConfigs) {
                logger.info("Initializing downloader {}", downloaderConfig.getName());
                try {
                    Downloader downloader = beanFactory.createBean(downloaderClasses.get(downloaderConfig.getDownloaderType()));
                    downloader.intialize(downloaderConfig);
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
        Downloader downloader = beanFactory.createBean(downloaderClasses.get(downloaderConfig.getDownloaderType()));
        downloader.intialize(downloaderConfig);
        return downloader.checkConnection();
    }

    public Collection<Downloader> getAllDownloaders() {
        return downloadersMap.values();
    }

    public Downloader getDownloaderByName(String downloaderName) {
        if (!downloadersMap.containsKey(downloaderName.toLowerCase())) {
            throw new IllegalArgumentException("Unable to find indexer with name " + downloaderName);
        }
        return downloadersMap.get(downloaderName.toLowerCase());
    }

}
