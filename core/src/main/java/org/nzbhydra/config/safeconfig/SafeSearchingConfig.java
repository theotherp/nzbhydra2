package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;


@Getter
public class SafeSearchingConfig {

    private final boolean ignoreTemporarilyDisabled;
    private Integer maxAge;
    private boolean showQuickFilterButtons;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        showQuickFilterButtons = searchingConfig.isShowQuickFilterButtons();
        maxAge = searchingConfig.getMaxAge().orElse(null);
        ignoreTemporarilyDisabled = searchingConfig.isIgnoreTemporarilyDisabled();
    }


}
