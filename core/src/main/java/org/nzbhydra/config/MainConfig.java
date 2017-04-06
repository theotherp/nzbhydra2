package org.nzbhydra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;

@ConfigurationProperties("main")
@Component
@Data
public class MainConfig {

    private String apiKey = null;
    private String branch = "master";
    private Integer configVersion = 1;
    private boolean debug = false;
    private String dereferer = null;
    private String externalUrl = null;
    private Instant firstStart = null;
    private String gitPath = null;
    private String host = "0.0.0.0";
    private String httpProxy = null;
    private String httpsProxy = null;
    private boolean isFirstStart = true;
    private LoggingConfig logging = new LoggingConfig();
    private int keepSearchResultsForDays = 7;
    private int port = 5075;
    private String repositoryBase = "https://github.com/theotherp";
    private String secret = "TODO generate";
    private boolean shutdownForRestart = true;
    private String socksProxy;
    private boolean ssl = false;
    private String sslcert = null;
    private String sslkey = null;
    private boolean startupBrowser = true;
    protected String theme = "grey";
    protected String urlBase = "/";
    private boolean useCsrf = true;
    private boolean useLocalUrlForApiAccess = true;

    public Optional<String> getExternalUrl() {
        return Optional.ofNullable(externalUrl);
    }

    public Optional<String> getApiKey() {
        return Optional.ofNullable(apiKey);
    }

    public Optional<String> getHttpProxy() {
        return Optional.ofNullable(httpProxy);
    }

    public Optional<String> getHttpsProxy() {
        return Optional.ofNullable(httpsProxy);
    }

    public Optional<String> getSocksProxy() {
        return Optional.ofNullable(socksProxy);
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
}
