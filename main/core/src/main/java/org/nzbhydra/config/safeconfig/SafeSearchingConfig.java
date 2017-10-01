package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;


@Getter
public class SafeSearchingConfig {

    private boolean alwaysShowDuplicates = false;
    private boolean enableCategorySizes = true;
    private Integer maxAge;
    private boolean showQuickFilterButtons;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        alwaysShowDuplicates = searchingConfig.isAlwaysShowDuplicates();
        enableCategorySizes = searchingConfig.isEnableCategorySizes();
        showQuickFilterButtons = searchingConfig.isShowQuickFilterButtons();
        maxAge = searchingConfig.getMaxAge().orElse(null);
    }


}
