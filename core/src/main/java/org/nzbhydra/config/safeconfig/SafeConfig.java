package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.Category;

import java.util.List;
import java.util.stream.Collectors;

@Getter
public class SafeConfig {

    public SafeConfig(BaseConfig baseConfig) {
        this.authType = baseConfig.getAuth().getAuthType();
        this.dereferer = baseConfig.getMain().getDereferer();
        this.searching = new SafeSearchingConfig(baseConfig.getSearching());
        this.downloaders = baseConfig.getDownloaders().stream().map(SafeDownloaderConfig::new).collect(Collectors.toList());
        this.categories = baseConfig.getCategories();
    }

    private List<Category> categories;
    private AuthType authType;
    private String dereferer;
    private SafeSearchingConfig searching;
    private List<SafeDownloaderConfig> downloaders;

}
