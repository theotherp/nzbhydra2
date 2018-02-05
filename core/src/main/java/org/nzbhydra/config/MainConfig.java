package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@ConfigurationProperties("main")
@Component
@Data
public class MainConfig extends ValidatingConfig {

    private static final Logger logger = LoggerFactory.getLogger(MainConfig.class);

    @SensitiveData
    private String apiKey = null;
    private Integer configVersion = 1;
    private boolean backupEverySunday = true;
    private boolean backupBeforeUpdate = true;
    private Integer deleteBackupsAfterWeeks = 4;
    private String dereferer = null;
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
    @RestartRequired
    private boolean useCsrf = true;
    @RestartRequired
    private boolean usePackagedCaCerts = true;
    @RestartRequired
    private boolean verifySsl = true;
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

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig) {
        ConfigValidationResult result = new ConfigValidationResult();
        MainConfig oldMain = oldConfig.getMain();
        if (oldMain.getPort() != port || (oldMain.getUrlBase().isPresent() && !oldMain.getUrlBase().get().equals(urlBase) || oldMain.isSsl() != isSsl()) && !startupBrowser) {
            result.getWarningMessages().add("You've maded changes that affect Hydra's URL and require a restart. Hydra will try to reload to the new URL when it's back.");
        }

        if (!Strings.isNullOrEmpty(urlBase) && (!urlBase.startsWith("/") || urlBase.endsWith("/") || "/".equals(urlBase))) {
            if (!urlBase.startsWith("/")) {
                urlBase = "/" + urlBase;
            }
            if (urlBase.endsWith("/")) {
                urlBase = urlBase.substring(0, urlBase.length() - 1);
            }
            if ("/".equals(urlBase) || "".equals(urlBase)) {
                urlBase = null;
            }
            if (urlBase != null) {
                result.getWarningMessages().add("Changed URL base to " + urlBase);
            } else {
                result.getWarningMessages().add("Removed URL base");
            }
        }

        ConfigValidationResult loggingResult = getLogging().validateConfig(oldConfig);
        result.getWarningMessages().addAll(loggingResult.getWarningMessages());
        result.getErrorMessages().addAll(loggingResult.getErrorMessages());

        result.setRestartNeeded(loggingResult.isRestartNeeded() || isRestartNeeded(oldMain));
        result.setOk(loggingResult.isOk() && result.isOk());

        return result;
    }
}
