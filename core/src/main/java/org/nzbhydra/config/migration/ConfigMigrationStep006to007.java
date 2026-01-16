

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

public class ConfigMigrationStep006to007 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep006to007.class);

    @Override
    public int forVersion() {
        return 6;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> downloadingConfig = getFromMap(toMigrate, "downloading");
        List<Map<String, Object>> downloaders = getListFromMap(downloadingConfig, "downloaders");
        for (Map<String, Object> categoryConfig : downloaders) {
            String category = (String) categoryConfig.get("defaultCategory");
            if ("No category".equals(category)) {
                categoryConfig.put("defaultCategory", "Use original category");
            }
        }

        return toMigrate;
    }
}
