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

package org.nzbhydra.config.migration;

import org.nzbhydra.config.MainConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.yaml.snakeyaml.error.YAMLException;

import java.util.*;

@SuppressWarnings("unchecked")
public class ConfigMigration {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);


    public Map<String, Object> migrate(Map<String, Object> map) {

        int configVersion;
        configVersion = getConfigVersionFromConfigMap(map);

        List<ConfigMigrationStep> steps = getMigrationSteps();
        for (ConfigMigrationStep step : steps) {
            if (configVersion <= step.forVersion()) {
                logger.info("Migrating config from version {}", step.forVersion());
                map = step.migrate(map);
                configVersion = getConfigVersionFromConfigMap(map);
            }
        }
        Integer expectedConfigVersion = new MainConfig().getConfigVersion();
        if (configVersion != expectedConfigVersion) {
            logger.error("Expected the config to be at version {} but it's at version {}", expectedConfigVersion, configVersion);
        }

        return map;
    }

    protected int getConfigVersionFromConfigMap(Map<String, Object> map) {
        int configVersion;
        try {
            configVersion = (int) ((Map<String, Object>) map.get("main")).get("configVersion");
        } catch (NullPointerException | NumberFormatException e) {
            logger.error("Unable to read config version from settings file. It might be corrupt");
            throw new YAMLException("Unable to read config version from settings file. It might be corrupt");
        }
        return configVersion;
    }

    protected List<ConfigMigrationStep> getMigrationSteps() {
        ClassPathScanningCandidateComponentProvider provider = new ClassPathScanningCandidateComponentProvider(false);
        provider.addIncludeFilter(new AssignableTypeFilter(ConfigMigrationStep.class));
        Set<BeanDefinition> candidates = provider.findCandidateComponents(ConfigMigrationStep.class.getPackage().getName());

        List<ConfigMigrationStep> steps = new ArrayList<>();
        for (BeanDefinition beanDefinition : candidates) {
            try {
                ConfigMigrationStep instance = (ConfigMigrationStep) Class.forName(beanDefinition.getBeanClassName()).getConstructor().newInstance();
                steps.add(instance);
            } catch (Exception e) {
                logger.error("Unable to instantiate migration step from class " + beanDefinition.getBeanClassName(), e);
            }
        }

        Collections.sort(steps);
        return steps;
    }

}
