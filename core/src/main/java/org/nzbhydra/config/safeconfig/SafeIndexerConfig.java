package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.IndexerConfig.SourceEnabled;

import java.util.Set;

@Data
public class SafeIndexerConfig {

    private String name;
    private boolean preselect;
    private boolean enabled;
    private Set<String> categories;
    private boolean showOnSearch;
    SourceEnabled enabledForSearchSource;
}
