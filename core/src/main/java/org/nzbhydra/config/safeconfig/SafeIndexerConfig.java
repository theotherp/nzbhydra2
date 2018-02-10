package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.IndexerConfig;

import java.util.List;

@Data
public class SafeIndexerConfig {

    private String name;
    private boolean preselect;
    private String state;
    private List<String> categories;
    private boolean showOnSearch;
    private String enabledForSearchSource;
    private String searchModuleType;

    public SafeIndexerConfig(IndexerConfig indexerConfig) {
        this.name = indexerConfig.getName();
        this.preselect = indexerConfig.isPreselect();
        this.state = indexerConfig.getState().name();
        this.categories = indexerConfig.getEnabledCategories();
        this.showOnSearch = indexerConfig.isShowOnSearch();
        this.enabledForSearchSource = indexerConfig.getEnabledForSearchSource().name();
        this.searchModuleType = indexerConfig.getSearchModuleType().name();
    }

}
