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
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.DownloaderType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Component
public class DownloadingConfigValidator implements ConfigValidator<DownloadingConfig> {

    @Autowired
    private DownloaderConfigValidator downloaderConfigValidator;

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == DownloadingConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, DownloadingConfig newConfig) {
        List<String> errors = new ArrayList<>();
        if (newConfig.getSaveTorrentsTo().isPresent()) {
            File file = new File(newConfig.getSaveTorrentsTo().get());
            validateBlackholeFolder(errors, file, newConfig.getSaveTorrentsTo().get(), "Torrent");
        }
        if (newConfig.getSaveNzbsTo().isPresent()) {
            File file = new File(newConfig.getSaveNzbsTo().get());
            validateBlackholeFolder(errors, file, newConfig.getSaveNzbsTo().get(), "NZB");
        }
        List<ConfigValidationResult> validationResults = newConfig.getDownloaders().stream().map(downloaderConfig -> downloaderConfigValidator.validateConfig(oldBaseConfig, newBaseConfig, downloaderConfig)).toList();
        List<String> downloaderErrors = validationResults.stream().map(ConfigValidationResult::getErrorMessages).flatMap(Collection::stream).toList();
        errors.addAll(downloaderErrors);

        List<String> warnings = new ArrayList<>();

        if (isEnabledWithoutRedirect(newBaseConfig, "nzbs.in")) {
            warnings.add("nzbs.in forbids NZBHydra to download NZBs directly. The NZB access type \"Redirect to indexer\" will automatically be used for this indexer.");
        }
        if (isEnabledWithoutRedirect(newBaseConfig, "omgwtfnzbs")) {
            warnings.add("omgwftnzbs forbids NZBHydra to download NZBs directly. The NZB access type \"Redirect to indexer\" will automatically be used for this indexer.");
        }
        if (isEnabledWithoutRedirect(newBaseConfig, "nzbfinder")) {
            warnings.add("NZB Finder forbids NZBHydra to download NZBs directly. The NZB access type \"Redirect to indexer\" will automatically be used for this indexer.");
        }

        warnings.addAll(validationResults.stream().map(ConfigValidationResult::getWarningMessages).flatMap(Collection::stream).toList());

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }

    private static boolean isEnabledWithoutRedirect(BaseConfig newBaseConfig, String hostContains) {
        if (newBaseConfig.getDownloading().getDownloaders().stream().anyMatch(x -> x.isEnabled() && x.getDownloaderType() != DownloaderType.TORBOX)) {
            boolean indexerEnabled = newBaseConfig.getIndexers().stream().anyMatch(x -> x.getHost().toLowerCase().contains(hostContains) && x.getState() == IndexerConfig.State.ENABLED);
            return indexerEnabled && newBaseConfig.getDownloading().getNzbAccessType() != FileDownloadAccessType.REDIRECT;
        }
        return false;
    }

    private void validateBlackholeFolder(List<String> errors, File file, String blackholeSettings, final String blackholeType) {
        if (!file.isAbsolute()) {
            errors.add(blackholeType + " black hole folder " + blackholeSettings + " is not absolute");
        }
        if (file.exists() && !file.isDirectory()) {
            errors.add(blackholeType + " black hole folder " + file.getAbsolutePath() + " is a file");
        }
        if (!file.exists()) {
            boolean created = file.mkdir();
            if (!created) {
                errors.add(blackholeType + " black hole folder " + file.getAbsolutePath() + " could not be created");
            }
        }
    }

}
