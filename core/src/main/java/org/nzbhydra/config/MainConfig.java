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

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Strings;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.downloading.ProxyType;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@ConfigurationProperties(prefix = "main")
@Data
public class MainConfig {

    private static final Logger logger = LoggerFactory.getLogger(MainConfig.class);

    private Integer configVersion = 19;

    //Hosting settings
    @RestartRequired
    private String host = "0.0.0.0";
    @RestartRequired
    private int port = 5076;
    @RestartRequired
    protected String urlBase = null;


    //Proxy settings
    @RestartRequired
    @JsonFormat(shape = Shape.STRING)
    private ProxyType proxyType = ProxyType.NONE;
    @SensitiveData
    private String proxyHost = null;
    private int proxyPort;
    private boolean proxyIgnoreLocal = true;
    private List<String> proxyIgnoreDomains = new ArrayList<>();
    @SensitiveData
    private String proxyUsername;
    @SensitiveData
    private String proxyPassword;


    //Database settings
    private String backupFolder;
    private Integer backupEveryXDays = 7;
    private boolean backupBeforeUpdate = true;
    private Integer deleteBackupsAfterWeeks = 4;


    //History settings
    private boolean keepHistory = true;
    private Integer keepStatsForWeeks = null;
    private Integer keepHistoryForWeeks = null;


    //SSL settings
    @RestartRequired
    private boolean ssl = false;
    @RestartRequired
    private String sslKeyStore = null;
    @SensitiveData
    @RestartRequired
    private String sslKeyStorePassword = null;


    //Security settings
    @RestartRequired
    private boolean verifySsl = true;
    private boolean disableSslLocally = false;
    private List<String> sniDisabledFor = new ArrayList<>();
    private List<String> verifySslDisabledFor = new ArrayList<>();


    //Update settings
    private boolean updateAutomatically = false;
    private boolean updateToPrereleases = false;
    private boolean updateCheckEnabled = true;
    @JsonProperty("showUpdateBannerOnDocker")
    private boolean showUpdateBannerOnUpdatedExternally = true;
    private boolean showWhatsNewBanner = true;


    //Startup / GUI settings
    private boolean showNews = true;
    private boolean startupBrowser = true;
    private boolean welcomeShown = false;
    protected String theme;


    //Database settings
    @RestartRequired
    private int databaseCompactTime = 15_000;
    @RestartRequired
    private int databaseRetentionTime = 1000;
    @RestartRequired
    private int databaseWriteDelay = 5000;


    //Other settings
    @SensitiveData
    @DiffIgnore
    private String apiKey = null;
    private String dereferer = null;
    private boolean instanceCounterDownloaded = false;
    private String repositoryBase;
    private boolean shutdownForRestart = false;
    @RestartRequired
    private boolean useCsrf = true;
    @RestartRequired
    private int xmx;

    private LoggingConfig logging = new LoggingConfig();

    public Optional<String> getUrlBase() {
        return Optional.ofNullable(Strings.emptyToNull(urlBase));
    }

    public Optional<Integer> getDeleteBackupsAfterWeeks() {
        return Optional.ofNullable(deleteBackupsAfterWeeks);
    }

    public Optional<String> getDereferer() {
        return Optional.ofNullable(dereferer); //This must be returned as empty string so that the config can overwrite it
    }

    public Optional<Integer> getBackupEveryXDays() {
        return Optional.ofNullable(backupEveryXDays);
    }


}
