package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;
import java.util.stream.Collectors;

@Data
@ReflectionMarker
public class SafeConfig {

    private SafeCategoriesConfig categoriesConfig;
    private AuthType authType;
    private String dereferer;
    private SafeSearchingConfig searching;
    private SafeDownloadingConfig downloading;
    private SafeLoggingConfig logging;
    private SafeNotificationConfig notificationConfig;
    private boolean showNews;
    private boolean keepHistory;

    private List<SafeIndexerConfig> indexers;

    public SafeConfig(BaseConfig baseConfig) {
        this.authType = baseConfig.getAuth().getAuthType();
        this.dereferer = baseConfig.getMain().getDereferer().orElse("");
        this.searching = new SafeSearchingConfig(baseConfig.getSearching());
        this.downloading = new SafeDownloadingConfig(baseConfig.getDownloading());
        this.logging = new SafeLoggingConfig(baseConfig.getMain().getLogging());
        this.indexers = baseConfig.getIndexers().stream().map(indexerConfig -> new SafeIndexerConfig(indexerConfig, baseConfig)).collect(Collectors.toList());
        this.categoriesConfig = new SafeCategoriesConfig(baseConfig.getCategoriesConfig());
        this.notificationConfig = new SafeNotificationConfig(baseConfig.getNotificationConfig());
        this.showNews = baseConfig.getMain().isShowNews();
        this.keepHistory = baseConfig.getMain().isKeepHistory();
    }

    public String getAuthType() {
        return authType.name();
    }
}
