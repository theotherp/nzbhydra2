package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.io.File;
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
    private String databaseFolder;
    private String dereferer;
    @SensitiveData
    private String externalUrl = null;
    private String host;
    private String httpProxy = null;
    private String httpsProxy = null;
    private boolean firstStart;
    private LoggingConfig logging = new LoggingConfig();
    private int port;
    private String repositoryBase;
    private String secret;
    private boolean showNews;
    private boolean shutdownForRestart;
    private String socksProxy = null;
    private boolean ssl;
    private String sslcert = null;
    private String sslkey = null;
    private boolean startupBrowser;
    protected String theme;
    protected String urlBase = null;
    private boolean updateCheckEnabled;
    private boolean useCsrf;
    private boolean useLocalUrlForApiAccess;

    public void setDatabaseFolder(String databaseFolder) {
        if (databaseFolder != null && !new File(databaseFolder).isAbsolute() && !databaseFolder.startsWith("./")) {
            logger.warn("Database file setting seems to be relative but doesn't start with a \"./\". Will add it");
            databaseFolder = "./" + databaseFolder;
        }
        if (databaseFolder != null && databaseFolder.endsWith("/")) {
            databaseFolder = databaseFolder.substring(0, databaseFolder.length() - 1);
        }
        this.databaseFolder = databaseFolder;
    }

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

    public Optional<String> getDereferer() {
        return Optional.ofNullable(dereferer);
    }


    @Override
    public ConfigValidationResult validateConfig() {

        return new ConfigValidationResult();
    }
}
