package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;

import java.util.List;


@Getter
public class SafeSearchingConfig {

    private final boolean ignoreTemporarilyDisabled;
    private Integer coverSize;
    private Integer maxAge;
    private boolean showQuickFilterButtons;
    private boolean alwaysShowQuickFilterButtons;
    private List<String> customQuickFilterButtons;
    private int loadLimitInternal;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        coverSize = searchingConfig.getCoverSize();
        showQuickFilterButtons = searchingConfig.isShowQuickFilterButtons();
        alwaysShowQuickFilterButtons = searchingConfig.isAlwaysShowQuickFilterButtons();
        customQuickFilterButtons = searchingConfig.getCustomQuickFilterButtons();
        maxAge = searchingConfig.getMaxAge().orElse(null);
        ignoreTemporarilyDisabled = searchingConfig.isIgnoreTemporarilyDisabled();
        loadLimitInternal = searchingConfig.getLoadLimitInternal();
    }


}
