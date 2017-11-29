package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;


@Getter
public class SafeSearchingConfig {

    private boolean alwaysShowDuplicates = false;
    private Integer maxAge;
    private boolean showQuickFilterButtons;
    private boolean groupTorrentAndNewznabResults;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        alwaysShowDuplicates = searchingConfig.isAlwaysShowDuplicates();
        showQuickFilterButtons = searchingConfig.isShowQuickFilterButtons();
        maxAge = searchingConfig.getMaxAge().orElse(null);
        groupTorrentAndNewznabResults = searchingConfig.isGroupTorrentAndNewznabResults();
    }


}
