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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.MainConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AssignableTypeFilter;

import java.io.File;
import java.io.IOException;
import java.util.*;

@SuppressWarnings("unchecked")
public class ConfigMigration {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    private static final TypeReference<HashMap<String, Object>> MAP_TYPE_REFERENCE = new TypeReference<HashMap<String, Object>>() {
    };
    private static final DefaultPrettyPrinter defaultPrettyPrinter;

    protected List<ConfigMigrationStep> steps;
    protected int expectedConfigVersion;
    private static final ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
    private ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    static {
        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
    }

    public ConfigMigration() {
        steps = getMigrationSteps();
        expectedConfigVersion = new MainConfig().getConfigVersion();
    }

    public void migrate(File yamlFile) throws IOException {
        Map<String, Object> originalMap = objectMapper.readValue(yamlFile, MAP_TYPE_REFERENCE);
        Map<String, Object> migrated = migrate(originalMap);
        configReaderWriter.save(migrated, yamlFile);
    }

    public Map<String, Object> migrate(Map<String, Object> map) {
        int configVersion = (int) ((Map<String, Object>) map.get("main")).get("configVersion");

        for (ConfigMigrationStep step : steps) {
            if (configVersion <= step.forVersion()) {
                logger.info("Migrating config from version {}", step.forVersion());
                map = step.migrate(map);
                configVersion = step.forVersion() + 1;
            }
            ((Map<String, Object>) map.get("main")).put("configVersion", configVersion);
        }

        if (configVersion != expectedConfigVersion) {
            throw new RuntimeException(String.format("Expected the config after migration to be at version %d but it's at version %d", expectedConfigVersion, configVersion));
        }

        return map;
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
