package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.google.common.base.Strings;
import lombok.Data;
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
//@Component
@Data
public class MainConfig extends ValidatingConfig<MainConfig> {

    private static final Logger logger = LoggerFactory.getLogger(MainConfig.class);

    @SensitiveData
    private String apiKey = null;
    private Integer configVersion = 12;
    private String backupFolder;
    private Integer backupEveryXDays = 7;
    private boolean backupBeforeUpdate = true;
    private Integer deleteBackupsAfterWeeks = 4;
    private String dereferer = null;
    @RestartRequired
    private int databaseCompactTime = 15_000;
    private boolean instanceCounterDownloaded = false;
    private boolean keepHistory = true;
    @RestartRequired
    private String host = "0.0.0.0";
    private LoggingConfig logging = new LoggingConfig();
    @RestartRequired
    private int port = 5076;
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
    private String repositoryBase;
    private boolean showNews = true;
    private boolean showUpdateBannerOnDocker = true;
    private boolean shutdownForRestart = false;
    private List<String> sniDisabledFor = new ArrayList<>();
    @RestartRequired
    private boolean ssl = false;
    @RestartRequired
    private String sslKeyStore = null;
    @SensitiveData
    @RestartRequired
    private String sslKeyStorePassword = null;
    private boolean startupBrowser = true;
    protected String theme;
    @RestartRequired
    protected String urlBase = null;
    private boolean updateCheckEnabled = true;
    private boolean updateAutomatically = false;
    private boolean updateToPrereleases = false;
    @RestartRequired
    private boolean useCsrf = true;
    @RestartRequired
    private boolean verifySsl = true;
    private List<String> verifySslDisabledFor = new ArrayList<>();
    private boolean welcomeShown = false;
    @RestartRequired
    private int xmx;

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
            result.getWarningMessages().add("You've changed the host but NZBHydra seems to be run in docker. It's recommended to use the host '0.0.0.0'");
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

        ConfigValidationResult loggingResult = getLogging().validateConfig(oldConfig, getLogging(), newBaseConfig);
        result.getWarningMessages().addAll(loggingResult.getWarningMessages());
        result.getErrorMessages().addAll(loggingResult.getErrorMessages());

        oldMain = oldMain.prepareForSaving();
        result.setRestartNeeded(loggingResult.isRestartNeeded() || isRestartNeeded(oldMain));
        result.setOk(loggingResult.isOk() && result.isOk());

        return result;
    }

    @Override
    public MainConfig prepareForSaving() {
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
