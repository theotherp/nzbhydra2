package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.IndexerConfig;

import java.util.List;

@Data
public class SafeIndexerConfig {

    private String name;
    private boolean preselect;
    private boolean enabled;
    private List<String> categories;
    private boolean showOnSearch;
    String enabledForSearchSource;

    public SafeIndexerConfig(IndexerConfig indexerConfig) {
        this.name = indexerConfig.getName();
        this.preselect = indexerConfig.isPreselect();
        this.enabled = indexerConfig.isEnabled();
        this.categories = indexerConfig.getEnabledCategories();
        this.showOnSearch = indexerConfig.isShowOnSearch();
        this.enabledForSearchSource = indexerConfig.getEnabledForSearchSource().name();
    }

}
