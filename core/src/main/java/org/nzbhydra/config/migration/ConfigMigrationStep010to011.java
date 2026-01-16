

package org.nzbhydra.config.migration;

import java.util.Map;

public class ConfigMigrationStep010to011 implements ConfigMigrationStep {

    @Override
    public int forVersion() {
        return 10;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> main = getFromMap(toMigrate, "main");
        main.put("backupFolder", "data/backup");
        return toMigrate;
    }
}
