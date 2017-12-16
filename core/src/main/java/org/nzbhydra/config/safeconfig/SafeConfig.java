package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class SafeConfig {

    private SafeCategoriesConfig categoriesConfig;
    private AuthType authType;
    private String dereferer;
    private SafeSearchingConfig searching;
    private SafeDownloadingConfig downloading;
    private SafeLoggingConfig logging;
    private boolean showNews;

    private List<SafeIndexerConfig> indexers;

    public SafeConfig(BaseConfig baseConfig) {
        this.authType = baseConfig.getAuth().getAuthType();
        this.dereferer = baseConfig.getMain().getDereferer().orElse("");
        this.searching = new SafeSearchingConfig(baseConfig.getSearching());
        this.downloading = new SafeDownloadingConfig(baseConfig.getDownloading());
        this.logging = new SafeLoggingConfig(baseConfig.getMain().getLogging());
        this.indexers = baseConfig.getIndexers().stream().map(SafeIndexerConfig::new).collect(Collectors.toList());
        this.categoriesConfig = new SafeCategoriesConfig(baseConfig.getCategoriesConfig());
        this.showNews = baseConfig.getMain().isShowNews();
    }

    public String getAuthType() {
        return authType.name();
    }
}
