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

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.MainConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AssignableTypeFilter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@SuppressWarnings("unchecked")
public class ConfigMigration {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    protected List<ConfigMigrationStep> steps;
    protected int expectedConfigVersion;

    public ConfigMigration() {
        steps = getMigrationSteps();
        expectedConfigVersion = new MainConfig().getConfigVersion();
    }

    public BaseConfig migrate(BaseConfig toMigrate) {
        int configVersion = toMigrate.getMain().getConfigVersion();

        for (ConfigMigrationStep step : steps) {
            if (configVersion <= step.forVersion()) {
                logger.info("Migrating config from version {}", step.forVersion());
                toMigrate = step.migrate(toMigrate);
                configVersion = step.forVersion() + 1;
            }
            toMigrate.getMain().setConfigVersion(step.forVersion() + 1);
        }

        if (configVersion != expectedConfigVersion) {
            throw new RuntimeException(String.format("Expected the config after migration to be at version %d but it's at version %d", expectedConfigVersion, configVersion));
        }

        return toMigrate;
    }

    protected static List<ConfigMigrationStep> getMigrationSteps() {
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
