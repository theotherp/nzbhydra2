package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.google.common.base.Strings;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.downloading.ProxyType;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.io.IOException;
import java.math.BigInteger;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@ConfigurationProperties("main")
@Data
public class MainConfig extends ValidatingConfig<MainConfig> {

    private static final Logger logger = LoggerFactory.getLogger(MainConfig.class);

    private Integer configVersion = 16;

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
    private boolean showUpdateBannerOnDocker = true;


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

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, MainConfig newMainConfig, BaseConfig newBaseConfig) {
        ConfigValidationResult result = new ConfigValidationResult();
        MainConfig oldMain = oldConfig.getMain();
        boolean portChanged = oldMain.getPort() != port;
        boolean urlBaseChanged = oldMain.getUrlBase().isPresent() && !oldMain.getUrlBase().get().equals(urlBase);
        if (urlBase == null && oldMain.getUrlBase().isPresent() && oldMain.getUrlBase().get().equals("/")) {
            urlBaseChanged = false;
        }
        boolean sslChanged = oldMain.isSsl() != isSsl();
        if (portChanged || urlBaseChanged || sslChanged && !startupBrowser) {
            result.getWarningMessages().add("You've made changes that affect Hydra's URL and require a restart. Hydra will try and reload using the new URL when it's back.");
        }
        if (DebugInfosProvider.isRunInDocker() && !"0.0.0.0".equals(host)) {
            result.getWarningMessages().add("You've changed the host but NZBHydra seems to be run in docker. It's recommended to use the host '0.0.0.0'.");
        }
        if (!"0.0.0.0".equals(host)) {
            try {
                boolean reachable = InetAddress.getByName(host).isReachable(1);
                if (!reachable) {
                    result.getWarningMessages().add("The configured host address cannot be reached. Are you sure it is correct?");
                }
            } catch (IOException e) {
                //Ignore, user will have to know what he does
            }
        }
        if (oldConfig.getMain().getXmx() < 128) {
            result.getErrorMessages().add("The JVM memory must be set to at least 128");
        }

        MainConfig newMain = newBaseConfig.getMain();
        if (newMain.getKeepHistoryForWeeks() != null && newMain.getKeepHistoryForWeeks() <= 0) {
            result.getErrorMessages().add("Please either delete the value for \"Keep history for\" or set it to a positive value.");
        }
        if (newMain.getKeepStatsForWeeks() != null && newMain.getKeepStatsForWeeks() <= 0) {
            result.getErrorMessages().add("Please either delete the value for \"Keep stats for\" or set it to a positive value.");
        }
        if (newMain.getKeepStatsForWeeks() != null && newMain.getKeepHistoryForWeeks() != null && newMain.getKeepStatsForWeeks() > newMain.getKeepHistoryForWeeks()) {
            result.getErrorMessages().add("Please set the time to keep stats to a value not higher than the time to keep history.");
        }


        ConfigValidationResult validationResult = getLogging().validateConfig(oldConfig, getLogging(), newBaseConfig);
        result.getWarningMessages().addAll(validationResult.getWarningMessages());
        result.getErrorMessages().addAll(validationResult.getErrorMessages());

        oldMain = oldMain.prepareForSaving(oldConfig);
        result.setRestartNeeded(validationResult.isRestartNeeded() || isRestartNeeded(oldMain));
        result.setOk(validationResult.isOk() && result.isOk());

        return result;
    }

    @Override
    public MainConfig prepareForSaving(BaseConfig oldBaseConfig) {
        if (!Strings.isNullOrEmpty(urlBase) && (!urlBase.startsWith("/") || urlBase.endsWith("/") || "/".equals(urlBase))) {
            if (!urlBase.startsWith("/")) {
                urlBase = "/" + urlBase;
            }
            if (urlBase.endsWith("/")) {
                urlBase = urlBase.substring(0, urlBase.length() - 1);
            }
            if ("/".equals(urlBase) || "".equals(urlBase)) {
                urlBase = "/";
            }
            setUrlBase(urlBase);
        }
        return this;
    }

    @Override
    public MainConfig updateAfterLoading() {
        return this;
    }

    @Override
    public MainConfig initializeNewConfig() {
        Random random = new Random();
        setApiKey(new BigInteger(130, random).toString(32).toUpperCase());
        return this;
    }

}
