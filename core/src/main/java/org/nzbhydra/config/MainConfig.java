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
    private String host;

}
