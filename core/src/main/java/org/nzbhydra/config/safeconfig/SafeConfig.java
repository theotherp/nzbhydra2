package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;

import java.util.List;
import java.util.stream.Collectors;

@Getter
public class SafeConfig {

    private SafeCategoriesConfig categoriesConfig;
    private AuthType authType;
    private String dereferer;
    private SafeSearchingConfig searching;
    private List<SafeDownloaderConfig> downloaders;
    private List<SafeIndexerConfig> indexers;

    public SafeConfig(BaseConfig baseConfig) {
        this.authType = baseConfig.getAuth().getAuthType();
        this.dereferer = baseConfig.getMain().getDereferer();
        this.searching = new SafeSearchingConfig(baseConfig.getSearching());
        this.downloaders = baseConfig.getDownloaders().stream().map(SafeDownloaderConfig::new).collect(Collectors.toList());
        this.indexers = baseConfig.getIndexers().stream().map(SafeIndexerConfig::new).collect(Collectors.toList());
        this.categoriesConfig = new SafeCategoriesConfig(baseConfig.getCategoriesConfig());
    }

    public String getAuthType() {
        return authType.name();
    }
}
