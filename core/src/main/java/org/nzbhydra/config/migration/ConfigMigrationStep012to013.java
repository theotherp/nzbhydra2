

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep012to013 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 12;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {

        try {
            Map<String, Object> main = getFromMap(toMigrate, "main");
            String backupFolder = (String) main.get("backupFolder");
            if ("data/backup".equals(backupFolder)) {
                logger.info("Changing backup folder from data/backup to backup (relative to data folder)");
                main.put("backupFolder", "backup");
            }
        } catch (Exception e) {
            logger.error("Error while trying to update backup folder", e);
        }

        return toMigrate;
    }
}
