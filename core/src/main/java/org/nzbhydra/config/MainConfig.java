package org.nzbhydra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;

@ConfigurationProperties("main")
@Component
@Data
public class MainConfig {

    private String apiKey;
    private String branch;
    private Integer configVersion;
    private boolean debug;
    private String dereferer;
    private String externalUrl;
    private Instant firstStart;
    private String gitPath;
    private String host;
    private String httpProxy;
    private String httpsProxy;
    private boolean isFirstStart = false;
    private LoggingConfig logging;
    private int keepSearchResultsForDays = 7;
    private int port = 5075;
    private String repositoryBase = "https://github.com/theotherp";
    private String secret = "TODO generate";
    private boolean shutdownForRestart = true;
    private String socksProxy;
    private boolean ssl = false;
    private String sslcert;
    private String sslkey;
    private boolean startupBrowser = false;
    private String theme = "grey";
    private String urlBase = "/";
    private boolean useCsrf = true;
    private boolean useLocalUrlForApiAccess = true;

}
