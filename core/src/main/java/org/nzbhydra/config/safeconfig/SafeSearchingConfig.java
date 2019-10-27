package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;


@Getter
public class SafeSearchingConfig {

    private final boolean ignoreTemporarilyDisabled;
    private Integer coverSize;
    private Integer maxAge;
    private boolean showQuickFilterButtons;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        coverSize = searchingConfig.getCoverSize();
        showQuickFilterButtons = searchingConfig.isShowQuickFilterButtons();
        maxAge = searchingConfig.getMaxAge().orElse(null);
        ignoreTemporarilyDisabled = searchingConfig.isIgnoreTemporarilyDisabled();
    }


}
