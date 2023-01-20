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

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.LoggingConfig;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Iterator;

@Component
public class LoggingConfigValidator implements ConfigValidator<LoggingConfig> {

    private static final Logger logger = LoggerFactory.getLogger(LoggingConfigValidator.class);

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == LoggingConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, LoggingConfig newConfig) {
        ConfigValidationResult result = new ConfigValidationResult();

        result.setRestartNeeded(ConfigValidationTools.isRestartNeeded(oldBaseConfig.getMain().getLogging(), newConfig));

        if (newBaseConfig.getMain().getLogging().getMarkersToLog().size() > 3) {
            result.getWarningMessages().add("You have more than 3 logging markers enabled. This is very rarely useful. Please make sure that this is actually needed. When creating debug infos please only enable those markers requested by the developer.");
        }

        return result;
    }

    @Override
    public LoggingConfig prepareForSaving(BaseConfig oldBaseConfig, LoggingConfig newConfig) {
        for (Iterator<String> iterator = newConfig.getMarkersToLog().iterator(); iterator.hasNext(); ) {
            String marker = iterator.next();
            if (Arrays.stream(LoggingMarkers.class.getDeclaredFields()).noneMatch(x -> x.getName().equals(marker))) {
                logger.info("Removing logging marker that doesn't exist anymore.");
                iterator.remove();
            }
        }
        return newConfig;
    }
}
