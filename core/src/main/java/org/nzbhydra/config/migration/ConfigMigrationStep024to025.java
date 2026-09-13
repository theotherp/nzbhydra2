package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep024to025 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep024to025.class);

    private static final int OLD_DEFAULT_DATABASE_WRITE_DELAY = 5000;
    private static final int NEW_DEFAULT_DATABASE_WRITE_DELAY = 500;

    @Override
    public int forVersion() {
        return 24;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> main = getFromMap(toMigrate, "main");
        if (main != null) {
            Object databaseWriteDelay = main.get("databaseWriteDelay");
            if (databaseWriteDelay instanceof Number number && number.intValue() == OLD_DEFAULT_DATABASE_WRITE_DELAY) {
                logger.info("Migrating databaseWriteDelay from the old default of {} to the new default of {}", OLD_DEFAULT_DATABASE_WRITE_DELAY, NEW_DEFAULT_DATABASE_WRITE_DELAY);
                main.put("databaseWriteDelay", NEW_DEFAULT_DATABASE_WRITE_DELAY);
            }
        }

        return toMigrate;
    }

}
