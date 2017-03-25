package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.searching.infos.InfoProvider.IdType;
import org.nzbhydra.searching.searchmodules.AbstractIndexer.BACKEND_TYPE;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig {

    private SearchSource accessType;
    private String apikey;
    private BACKEND_TYPE backend;
    private List<String> categories;
    private Integer downloadLimit;
    private boolean enabled;
    private Integer hitLimit;
    private Integer hitLimitResetTime;
    private String host;
    private Integer loadLimitOnRandom;
    private String name;
    private String password;
    private boolean preselect;
    private Integer score;
    private String searchModuleType;
    private boolean showOnSearch;
    private Set<IdType> supportedSearchIds = new HashSet<>();
    private Integer timeout;
    private String type;
    private String username;

}
