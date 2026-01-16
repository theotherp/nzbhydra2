

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

public class ConfigMigrationStep020to021 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 20;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> downloadingConfig = getFromMap(toMigrate, "downloading");
        List<Map<String, Object>> downloaders = getListFromMap(downloadingConfig, "downloaders");
        for (Map<String, Object> downloader : downloaders) {
            if (downloader.get("downloaderType").equals("TORBOX")) {
                downloader.put("downloadType", "TORBOX");
            }
        }

        return toMigrate;
    }
}
