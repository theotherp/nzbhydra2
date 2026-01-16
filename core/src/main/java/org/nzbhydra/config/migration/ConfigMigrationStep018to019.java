

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigrationStep018to019 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 18;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            Map<String, Object> main = getFromMap(toMigrate, "main");
            String dereferer = (String) main.get("dereferer");
            if ("http://www.dereferer.org/?$s".equals(dereferer)) {
                logger.info("Removing dereferer.org as it's offline");
                main.put("dereferer", null);
            }
        } catch (Exception e) {
            logger.error("Error while trying to remove dereferer.org", e);
        }

        return toMigrate;
    }
}
