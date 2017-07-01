package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@ConfigurationProperties("main")
@Component
@Data
public class MainConfig extends ValidatingConfig {

    private static final Logger logger = LoggerFactory.getLogger(MainConfig.class);

    @SensitiveData
    private String apiKey = null;
    private Integer configVersion;
    private boolean backupEverySunday;
    private String dereferer;
    @SensitiveData
    private String externalUrl = null;
    private String host;
    private boolean firstStart;
    private LoggingConfig logging = new LoggingConfig();
    private int port;
    private String proxyHost = null;
    private int proxyPort;
    private boolean proxyIgnoreLocal;
    private List<String> proxyIgnoreDomains;
    private String proxyUsername;
    private String proxyPassword;
    private String repositoryBase;
    private String secret;
    private boolean showNews;
    private boolean shutdownForRestart;
    private boolean ssl;
    private String sslcert = null;
    private String sslkey = null;
    private boolean startupBrowser;
    protected String theme;
    protected String urlBase = null;
    private boolean updateCheckEnabled;
    private boolean useCsrf;
    private boolean useLocalUrlForApiAccess;
    private boolean verifySsl;

    public Optional<String> getExternalUrl() {
        return Optional.ofNullable(externalUrl);
    }

    public Optional<String> getProxyHost() {
        return Optional.ofNullable(proxyHost);
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
