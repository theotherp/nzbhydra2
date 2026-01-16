

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep004to005 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep004to005.class);

    @Override
    public int forVersion() {
        return 4;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> main = getFromMap(toMigrate, "main");
        main.putIfAbsent("urlBase", "/");

        return toMigrate;
    }
}
