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

package org.nzbhydra.config.downloading;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.google.common.base.Strings;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.ValidatingConfig;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Data
@ConfigurationProperties(prefix = "downloading")
public class DownloadingConfig extends ValidatingConfig<DownloadingConfig> {

    @DiffIgnore
    private List<DownloaderConfig> downloaders = new ArrayList<>();
    private String saveTorrentsTo;
    private String saveNzbsTo;
    private boolean sendMagnetLinks;
    private boolean updateStatuses;
    private boolean showDownloaderStatus = true;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private FileDownloadAccessType nzbAccessType = FileDownloadAccessType.REDIRECT;
    private SearchSourceRestriction fallbackForFailed = SearchSourceRestriction.BOTH;
    private String externalUrl;
    private String primaryDownloader;

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, DownloadingConfig newConfig, BaseConfig newBaseConfig) {
        List<String> errors = new ArrayList<>();
        if (getSaveTorrentsTo().isPresent()) {
            File file = new File(getSaveTorrentsTo().get());
            validateBlackholeFolder(errors, file, getSaveTorrentsTo().get(), "Torrent");
        }
        if (getSaveNzbsTo().isPresent()) {
            File file = new File(getSaveNzbsTo().get());
            validateBlackholeFolder(errors, file, getSaveNzbsTo().get(), "NZB");
        }
        List<ConfigValidationResult> validationResults = downloaders.stream().map(downloaderConfig -> downloaderConfig.validateConfig(oldConfig, downloaderConfig, newBaseConfig)).collect(Collectors.toList());
        List<String> downloaderErrors = validationResults.stream().map(ConfigValidationResult::getErrorMessages).flatMap(Collection::stream).collect(Collectors.toList());
        errors.addAll(downloaderErrors);

        List<String> warnings = new ArrayList<>();

        if (newBaseConfig.getIndexers().stream().anyMatch(x -> x.getHost().toLowerCase().contains("nzbs.in")) && newConfig.getNzbAccessType() != FileDownloadAccessType.REDIRECT) {
            warnings.add("nzbs.in requires special configurations to be made or your API account will be disabled. You should set the NZB access type in the downloading config to \"Redirect to indexer\".");
        }

        warnings.addAll(validationResults.stream().map(ConfigValidationResult::getWarningMessages).flatMap(Collection::stream).collect(Collectors.toList()));

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
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

    public Optional<String> getSaveTorrentsTo() {
        return Optional.ofNullable(Strings.emptyToNull(saveTorrentsTo));
    }

    public Optional<String> getSaveNzbsTo() {
        return Optional.ofNullable(saveNzbsTo);
    }

    public Optional<String> getExternalUrl() {
        return Optional.ofNullable(externalUrl);
    }

    @Override
    public DownloadingConfig prepareForSaving(BaseConfig oldBaseConfig) {
        return this;
    }

    @Override
    public DownloadingConfig updateAfterLoading() {
        return this;
    }

    @Override
    public DownloadingConfig initializeNewConfig() {
        return this;
    }

}
