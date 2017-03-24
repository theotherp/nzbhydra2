package org.nzbhydra.searching;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.Set;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig {

    private String name;
    private String host;
    private String apikey;
    private String searchModuleType;
    private Integer score;
    private Set<String> supportedSearchIds = new HashSet<>();

}
