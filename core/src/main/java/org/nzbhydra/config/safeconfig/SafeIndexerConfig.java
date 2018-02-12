package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;

import java.util.List;

@Data
public class SafeIndexerConfig {

    private String name;
    private boolean preselect;
    private List<String> categories;
    private boolean showOnSearch;
    private String enabledForSearchSource;
    private String searchModuleType;

    public SafeIndexerConfig(IndexerConfig indexerConfig, BaseConfig baseConfig) {
        this.name = indexerConfig.getName();
        this.preselect = indexerConfig.isPreselect();
        this.categories = indexerConfig.getEnabledCategories();
        this.showOnSearch = indexerConfig.isEligibleForInternalSearch(baseConfig.getSearching().isIgnoreTemporarilyDisabled());
        this.enabledForSearchSource = indexerConfig.getEnabledForSearchSource().name();
        this.searchModuleType = indexerConfig.getSearchModuleType().name();
    }

}
