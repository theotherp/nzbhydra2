package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;

import java.util.List;


@Getter
public class SafeSearchingConfig {

    private final boolean ignoreTemporarilyDisabled;
    private final Integer coverSize;
    private final Integer maxAge;
    private final boolean showQuickFilterButtons;
    private final boolean alwaysShowQuickFilterButtons;
    private final List<String> customQuickFilterButtons;
    private final List<String> preselectQuickFilterButtons;
    private final int loadLimitInternal;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        coverSize = searchingConfig.getCoverSize();
        showQuickFilterButtons = searchingConfig.isShowQuickFilterButtons();
        alwaysShowQuickFilterButtons = searchingConfig.isAlwaysShowQuickFilterButtons();
        customQuickFilterButtons = searchingConfig.getCustomQuickFilterButtons();
        preselectQuickFilterButtons = searchingConfig.getPreselectQuickFilterButtons();
        maxAge = searchingConfig.getMaxAge().orElse(null);
        ignoreTemporarilyDisabled = searchingConfig.isIgnoreTemporarilyDisabled();
        loadLimitInternal = searchingConfig.getLoadLimitInternal();
    }


}
