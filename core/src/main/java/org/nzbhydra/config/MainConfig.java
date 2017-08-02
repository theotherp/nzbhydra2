package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;
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
    private String host = "0.0.0.0";
    private boolean firstStart = true;
    private Long firstStartedAt = Instant.now().getEpochSecond();
    private LoggingConfig logging = new LoggingConfig();
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
    private boolean ssl = false;
    private String sslcert = null;
    private String sslkey = null;
    private boolean startupBrowser = true;
    protected String theme;
    protected String urlBase = null;
    private boolean updateCheckEnabled = true;
    private boolean useCsrf = true;
    private boolean useLocalUrlForApiAccess = true;
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
    public ConfigValidationResult validateConfig() {

        return new ConfigValidationResult();
    }
}
