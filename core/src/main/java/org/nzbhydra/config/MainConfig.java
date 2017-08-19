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
    private String dereferer = null;
    @SensitiveData
    private String externalUrl = null;
    @RestartRequired
    private String host = "0.0.0.0";
    private LoggingConfig logging = new LoggingConfig();
    @RestartRequired
    private int port = 5076;
    @JsonFormat(shape = Shape.STRING)
    private ProxyType proxyType = ProxyType.NONE;
    private String proxyHost = null;
    private int proxyPort;
    private boolean proxyIgnoreLocal = true;
    private List<String> proxyIgnoreDomains = new ArrayList<>();
    private String proxyUsername;
    private String proxyPassword;
    private String repositoryBase;
    private String secret;
    private boolean showNews = true;
    private boolean shutdownForRestart = false;
    @RestartRequired
    private boolean ssl = false;
    @RestartRequired
    private String sslcert = null;
    @RestartRequired
    private String sslkey = null;
    private boolean startupBrowser = true;
    protected String theme;
    @RestartRequired
    protected String urlBase = null;
    private boolean updateCheckEnabled = true;
    @RestartRequired
    private boolean useCsrf = true;
    private boolean useLocalUrlForApiAccess = true;
    @RestartRequired
    private boolean verifySsl = true;
    private boolean welcomeShown = false;

    public Optional<String> getExternalUrl() {
        return Optional.ofNullable(externalUrl);
    }

    public Optional<String> getApiKey() {
        return Optional.ofNullable(apiKey);
    }

    public Optional<String> getSslcert() {
        return Optional.ofNullable(sslcert);
    }

    public Optional<String> getSslkey() {
        return Optional.ofNullable(sslkey);
    }

    public Optional<String> getUrlBase() {
        return Optional.ofNullable(urlBase);
    }

    public Optional<String> getDereferer() {
        return Optional.ofNullable(dereferer);
    }


    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig) {
        ConfigValidationResult result = new ConfigValidationResult();
        if (oldConfig.getMain().getPort() != port || (oldConfig.getMain().getUrlBase().isPresent() && !oldConfig.getMain().getUrlBase().get().equals(urlBase)) && !startupBrowser) {
            result.getWarningMessages().add("Your port and/or URL base has changed. Make sure to load the correct URL after restart");
        }

        if (!Strings.isNullOrEmpty(urlBase) && (!urlBase.startsWith("/") || urlBase.endsWith("/"))) {
            if (!urlBase.startsWith("/")) {
                urlBase = "/" + urlBase;
            }
            if (urlBase.endsWith("/")) {
                urlBase = urlBase.substring(0, urlBase.length() - 1);
            }
            result.getWarningMessages().add("Changed URL base to " + urlBase);
        }

        ConfigValidationResult loggingResult = getLogging().validateConfig(oldConfig);
        result.getWarningMessages().addAll(loggingResult.getWarningMessages());
        result.getErrorMessages().addAll(loggingResult.getErrorMessages());

        result.setRestartNeeded(loggingResult.isRestartNeeded() || isRestartNeeded(oldConfig.getMain()));
        result.setOk(loggingResult.isOk() && result.isOk());

        return result;
    }
}
