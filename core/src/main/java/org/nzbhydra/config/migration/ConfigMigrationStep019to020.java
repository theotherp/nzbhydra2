

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

public class ConfigMigrationStep019to020 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 19;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            Map<String, Object> searching = getFromMap(toMigrate, "searching");
            List<Map<String, Object>> customMappings = (List<Map<String, Object>>) searching.get("customMappings");
            for (Map<String, Object> mapping : customMappings) {
                mapping.put("matchAll", "true");
            }
            searching.put("customMappings", customMappings);
            toMigrate.put("searching", searching);
        } catch (Exception e) {
            logger.error("Error while trying to set custom mappings to 'match all'", e);
        }

        return toMigrate;
    }
}
