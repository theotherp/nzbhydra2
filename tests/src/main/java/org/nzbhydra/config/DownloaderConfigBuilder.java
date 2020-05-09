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

package org.nzbhydra.config;

import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.DownloaderType;
import org.nzbhydra.config.downloading.NzbAddingType;

public final class DownloaderConfigBuilder {
    private String apiKey = "apikey";
    private String defaultCategory;
    private DownloadType downloadType = DownloadType.NZB;
    private boolean enabled = true;
    private String iconCssClass;
    private String name;
    private NzbAddingType nzbAddingType = NzbAddingType.UPLOAD;
    private DownloaderType downloaderType = DownloaderType.SABNZBD;
    private String url = "http://127.0.0.1:7070";
    private String username = "sab";
    private String password = "nzbd";

    private DownloaderConfigBuilder() {
    }

    public static DownloaderConfigBuilder builder() {
        return new DownloaderConfigBuilder();
    }

    public DownloaderConfigBuilder apiKey(String apiKey) {
        this.apiKey = apiKey;
        return this;
    }

    public DownloaderConfigBuilder defaultCategory(String defaultCategory) {
        this.defaultCategory = defaultCategory;
        return this;
    }

    public DownloaderConfigBuilder downloadType(DownloadType downloadType) {
        this.downloadType = downloadType;
        return this;
    }

    public DownloaderConfigBuilder enabled(boolean enabled) {
        this.enabled = enabled;
        return this;
    }

    public DownloaderConfigBuilder iconCssClass(String iconCssClass) {
        this.iconCssClass = iconCssClass;
        return this;
    }

    public DownloaderConfigBuilder name(String name) {
        this.name = name;
        return this;
    }

    public DownloaderConfigBuilder nzbAddingType(NzbAddingType nzbAddingType) {
        this.nzbAddingType = nzbAddingType;
        return this;
    }

    public DownloaderConfigBuilder downloaderType(DownloaderType downloaderType) {
        this.downloaderType = downloaderType;
        return this;
    }

    public DownloaderConfigBuilder url(String url) {
        this.url = url;
        return this;
    }

    public DownloaderConfigBuilder username(String username) {
        this.username = username;
        return this;
    }

    public DownloaderConfigBuilder password(String password) {
        this.password = password;
        return this;
    }

    public DownloaderConfig build() {
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setApiKey(apiKey);
        downloaderConfig.setDefaultCategory(defaultCategory);
        downloaderConfig.setDownloadType(downloadType);
        downloaderConfig.setEnabled(enabled);
        downloaderConfig.setIconCssClass(iconCssClass);
        downloaderConfig.setName(name);
        downloaderConfig.setNzbAddingType(nzbAddingType);
        downloaderConfig.setDownloaderType(downloaderType);
        downloaderConfig.setUrl(url);
        downloaderConfig.setUsername(username);
        downloaderConfig.setPassword(password);
        return downloaderConfig;
    }
}
