package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;

import java.util.Set;

@Data
public class SafeIndexerConfig {

    private String name;
    private boolean preselect;
    private boolean enabled;
    private Set<String> categories;
    private boolean showOnSearch;
    SearchSourceRestriction enabledForSearchSource;

    public SafeIndexerConfig(IndexerConfig indexerConfig) {
        this.name = indexerConfig.getName();
        this.preselect = indexerConfig.isPreselect();
        this.enabled = indexerConfig.isEnabled();
        this.categories = indexerConfig.getCategories();
        this.showOnSearch = indexerConfig.isShowOnSearch();
        this.enabledForSearchSource = indexerConfig.getEnabledForSearchSource();
    }

    public String getEnabledForSearchSource() {
        return enabledForSearchSource.name();
    }
}
