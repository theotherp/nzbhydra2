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

import com.google.common.base.Joiner;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@SuppressWarnings("unchecked")
@Component
public class BaseConfigValidator implements ConfigValidator<BaseConfig> {

    private static final Logger logger = LoggerFactory.getLogger(BaseConfigValidator.class);

    @Autowired
    private CategoriesConfigValidator categoriesConfigValidator;
    @Autowired
    private DownloadingConfigValidator downloadingConfigValidator;
    @Autowired
    private SearchingConfigValidator searchingConfigValidator;
    @Autowired
    private MainConfigValidator mainConfigValidator;
    @Autowired
    private AuthConfigValidator authConfigValidator;
    @Autowired
    private IndexerConfigValidator indexerConfigValidator;
    @Autowired
    private List<ConfigValidator> configValidatorList;

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == BaseConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, BaseConfig newConfig) {
        final ConfigValidationResult configValidationResult = new ConfigValidationResult();
        final List<Object> configs = new ArrayList<>(Arrays.asList(
            newBaseConfig.getMain(),
            newBaseConfig.getSearching(),
            newBaseConfig.getDownloading(),
            newBaseConfig.getCategoriesConfig(),
            newBaseConfig.getAuth()
        ));
        configs.addAll(newConfig.getIndexers());
        for (Object config : configs) {
            final ConfigValidator validator = configValidatorList.stream().filter(x -> x.doesValidate(config.getClass())).findFirst().orElseThrow();
            final ConfigValidationResult result = validator.validateConfig(oldBaseConfig, newBaseConfig, config);
            configValidationResult.getErrorMessages().addAll(result.getErrorMessages());
            configValidationResult.getWarningMessages().addAll(result.getWarningMessages());
            configValidationResult.setRestartNeeded(configValidationResult.isRestartNeeded() || result.isRestartNeeded());
        }
        validateIndexers(newConfig, configValidationResult);


        if (!configValidationResult.getErrorMessages().isEmpty()) {
            logger.warn("Config validation returned errors:\n{}", Joiner.on("\n").join(configValidationResult.getErrorMessages()));
        }
        if (!configValidationResult.getWarningMessages().isEmpty()) {
            logger.warn("Config validation returned warnings:\n{}", Joiner.on("\n").join(configValidationResult.getWarningMessages()));
        }

        if (configValidationResult.isRestartNeeded()) {
            logger.warn("Settings were changed that require a restart to become effective");
        }

        configValidationResult.setOk(configValidationResult.getErrorMessages().isEmpty());

        return configValidationResult;
    }

    private void validateIndexers(BaseConfig newConfig, ConfigValidationResult configValidationResult) {
        if (!newConfig.getIndexers().isEmpty()) {
            if (newConfig.getIndexers().stream().noneMatch(x -> x.getState() == IndexerConfig.State.ENABLED)) {
                configValidationResult.getWarningMessages().add("No indexers enabled. Searches will return empty results");
            } else if (newConfig.getIndexers().stream().allMatch(x -> x.getSupportedSearchIds().isEmpty())) {
                if (newConfig.getSearching().getGenerateQueries() == SearchSourceRestriction.NONE) {
                    configValidationResult.getWarningMessages().add("No indexer found that supports search IDs. Without query generation searches using search IDs will return empty results.");
                } else if (newConfig.getSearching().getGenerateQueries() != SearchSourceRestriction.BOTH) {
                    String name = newConfig.getSearching().getGenerateQueries() == SearchSourceRestriction.API ? "internal" : "API";
                    configValidationResult.getWarningMessages().add("No indexer found that supports search IDs. Without query generation " + name + " searches using search IDs will return empty results.");
                }
            }
            Set<String> indexerNames = new HashSet<>();
            Set<String> duplicateIndexerNames = new HashSet<>();

            for (IndexerConfig indexer : newConfig.getIndexers()) {
                if (!indexerNames.add(indexer.getName())) {
                    duplicateIndexerNames.add(indexer.getName());
                }
            }
            if (!duplicateIndexerNames.isEmpty()) {
                configValidationResult.getErrorMessages().add("Duplicate indexer names found: " + Joiner.on(", ").join(duplicateIndexerNames));
            }


            final Set<Set<String>> indexersSameHostAndApikey = new HashSet<>();

            for (IndexerConfig indexer : newConfig.getIndexers()) {
                final Set<String> otherIndexersSameHostAndApiKey = newConfig.getIndexers().stream()
                    .filter(x -> x != indexer)
                    .filter(x -> IndexerConfig.isIndexerEquals(x, indexer))
                    .map(IndexerConfig::getName)
                    .collect(Collectors.toSet());
                if (!otherIndexersSameHostAndApiKey.isEmpty()) {
                    otherIndexersSameHostAndApiKey.add(indexer.getName());
                    if (indexersSameHostAndApikey.stream().noneMatch(x -> x.contains(indexer.getName()))) {
                        indexersSameHostAndApikey.add(otherIndexersSameHostAndApiKey);
                        final String message = "Found multiple indexers with same host and API key: " + Joiner.on(", ").join(otherIndexersSameHostAndApiKey);
                        logger.warn(message);
                        configValidationResult.getWarningMessages().add(message);
                    }
                }
            }

        } else {
            configValidationResult.getWarningMessages().add("No indexers configured. You won't get any results");
        }
    }

    @Override
    public BaseConfig prepareForSaving(BaseConfig oldBaseConfig, BaseConfig newConfig) {
        categoriesConfigValidator.prepareForSaving(oldBaseConfig, newConfig.getCategoriesConfig());
        downloadingConfigValidator.prepareForSaving(oldBaseConfig, newConfig.getDownloading());
        searchingConfigValidator.prepareForSaving(oldBaseConfig, newConfig.getSearching());
        mainConfigValidator.prepareForSaving(oldBaseConfig, newConfig.getMain());
        authConfigValidator.prepareForSaving(oldBaseConfig, newConfig.getAuth());
        newConfig.getIndexers().removeIf(Objects::isNull);
        newConfig.getIndexers().forEach(x -> indexerConfigValidator.prepareForSaving(oldBaseConfig, x));
        return newConfig;
    }

    @Override
    public BaseConfig updateAfterLoading(BaseConfig newConfig) {
        authConfigValidator.updateAfterLoading(newConfig.getAuth());
        return newConfig;
    }

    @Override
    public void initializeNewConfig(BaseConfig newConfig) {
        categoriesConfigValidator.initializeNewConfig(newConfig.getCategoriesConfig());
        downloadingConfigValidator.initializeNewConfig(newConfig.getDownloading());
        searchingConfigValidator.initializeNewConfig(newConfig.getSearching());
        mainConfigValidator.initializeNewConfig(newConfig.getMain());
        authConfigValidator.initializeNewConfig(newConfig.getAuth());
    }
}
