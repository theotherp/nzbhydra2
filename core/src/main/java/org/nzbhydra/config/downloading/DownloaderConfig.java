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

package org.nzbhydra.config.downloading;

import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ValidatingConfig;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Optional;

@Data
@ConfigurationProperties(prefix = "downloaders")
public class DownloaderConfig extends ValidatingConfig<DownloaderConfig> {

    @SensitiveData
    private String apiKey;
    private String defaultCategory;
    private DownloadType downloadType;
    private boolean enabled;
    private String iconCssClass;
    private String name;
    private NzbAddingType nzbAddingType;
    private DownloaderType downloaderType;
    @SensitiveData
    private String url;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }

    public Optional<String> getUsername() {
        return Optional.ofNullable(Strings.emptyToNull(username));
    }

    public Optional<String> getPassword() {
        return Optional.ofNullable(Strings.emptyToNull(password));
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, DownloaderConfig newDownloaderConfig) {
        return new ConfigValidationResult();
    }

    @Override
    public DownloaderConfig prepareForSaving() {
        return this;
    }

    @Override
    public DownloaderConfig updateAfterLoading() {
        return this;
    }

    @Override
    public DownloaderConfig initializeNewConfig() {
        return this;
    }


}
