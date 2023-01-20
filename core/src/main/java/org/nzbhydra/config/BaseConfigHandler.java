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

package org.nzbhydra.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.validation.BaseConfigValidator;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Comparator;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Component
public class BaseConfigHandler {

    private static final Logger logger = LoggerFactory.getLogger(BaseConfigHandler.class);

    private final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    private final Lock saveLock = new ReentrantLock();

    private BaseConfig toSave;

    private TimerTask delayedSaveTimerTask;

    public boolean initialized = false;

    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    @Autowired
    private BaseConfig baseConfig;
    @Autowired
    private BaseConfigValidator baseConfigValidator;

    @PostConstruct
    public void init() throws IOException {

        if (initialized) {
            //In some cases a call to the server will attempt to restart everything, trying to initialize beans. This
            //method is called a second time and an empty / initial config is written
            logger.warn("Init method called again. This can only happen during a faulty shutdown");
            return;
        }
        logger.info("Using data folder {}", NzbHydra.getDataFolder());
        replace(configReaderWriter.loadSavedConfig(), false);
        if (baseConfig.getMain().getApiKey() == null) {
            baseConfigValidator.initializeNewConfig(baseConfig);
        }
        //Always save config to keep it in sync with base config (remove obsolete settings and add new ones)
        configReaderWriter.save(baseConfig);

        delayedSaveTimerTask = new TimerTask() {
            @Override
            public void run() {
                saveToSave();
            }
        };
        Timer delayedSaveTimer = new Timer("delayedConfigSave", false);
        delayedSaveTimer.scheduleAtFixedRate(delayedSaveTimerTask, 10000, 10000);
        initialized = true;
    }

    public void replace(BaseConfig newConfig) {
        replace(newConfig, true);
    }

    public void replace(BaseConfig newConfig, boolean fireConfigChangedEvent) {
        BaseConfig oldBaseConfig = configReaderWriter.getCopy(baseConfig);
        baseConfig.setMain(newConfig.getMain());
        baseConfig.setIndexers(newConfig.getIndexers().stream().sorted(Comparator.comparing(IndexerConfig::getName)).collect(Collectors.toList()));
        baseConfig.setCategoriesConfig(newConfig.getCategoriesConfig());
        baseConfig.setSearching(newConfig.getSearching());
        baseConfig.setDownloading(newConfig.getDownloading());
        baseConfig.setAuth(newConfig.getAuth());
        baseConfig.setGenericStorage(newConfig.getGenericStorage());
        baseConfig.setNotificationConfig(newConfig.getNotificationConfig());


        if (fireConfigChangedEvent) {
            ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, oldBaseConfig, newConfig);
            applicationEventPublisher.publishEvent(configChangedEvent);
        }
    }

    public void save(boolean saveInstantly) {
        saveLock.lock();
        if (saveInstantly) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Saving instantly");
            configReaderWriter.save(baseConfig);
            toSave = null;
        } else {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Delaying save");
            toSave = baseConfig;
        }
        saveLock.unlock();
    }

    public void load() throws IOException {
        replace(configReaderWriter.loadSavedConfig());
    }


    @PreDestroy
    public void onShutdown() {
        saveToSave();
        delayedSaveTimerTask.cancel();
    }

    private void saveToSave() {
        saveLock.lock();
        if (toSave != null) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Executing delayed save");
            configReaderWriter.save(toSave);
            toSave = null;
        }
        saveLock.unlock();
    }


}
