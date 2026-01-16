

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep013to014 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 13;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            Map<String, Object> searching = getFromMap(toMigrate, "searching");
            Map<String, Object> downloading = getFromMap(toMigrate, "downloading");
            final String settingKey = "nzbAccessType";
            String nzbAccessType = (String) searching.get(settingKey);
            downloading.put(settingKey, nzbAccessType);
            searching.remove(settingKey);
            logger.info("Moved setting nzbAccessType to downloading config");
        } catch (Exception e) {
            logger.error("Error while trying to move NZB access type", e);
        }

        return toMigrate;
    }
}
