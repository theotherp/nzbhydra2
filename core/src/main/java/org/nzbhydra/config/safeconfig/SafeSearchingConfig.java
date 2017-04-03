package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.SearchingConfig;


@Getter
public class SafeSearchingConfig {

    private Integer maxAge;
    private boolean alwaysShowDuplicates = false;

    public SafeSearchingConfig(SearchingConfig searchingConfig) {
        this.maxAge = searchingConfig.getMaxAge();
        this.alwaysShowDuplicates = searchingConfig.isAlwaysShowDuplicates();
    }


}
