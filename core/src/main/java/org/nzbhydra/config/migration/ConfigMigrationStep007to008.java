

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep007to008 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep007to008.class);

    @Override
    public int forVersion() {
        return 7;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> downloadingConfig = getFromMap(toMigrate, "downloading");
        downloadingConfig.put("showDownloaderStatus", true);
        return toMigrate;
    }
}
