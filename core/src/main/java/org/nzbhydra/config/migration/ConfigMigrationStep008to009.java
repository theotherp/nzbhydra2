

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep008to009 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep008to009.class);

    @Override
    public int forVersion() {
        return 8;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> mainConfig = getFromMap(toMigrate, "main");
        if (mainConfig.containsKey("backupEverySunday")) {
            boolean backupEverySunday = (boolean) mainConfig.get("backupEverySunday");
            mainConfig.remove("backupEverySunday");
            mainConfig.put("backupEveryXDays", backupEverySunday ? 7 : null);
        } else if (!mainConfig.containsKey("backupEveryXDays")) {
            mainConfig.put("backupEveryXDays", 7);
        }
        return toMigrate;
    }
}
