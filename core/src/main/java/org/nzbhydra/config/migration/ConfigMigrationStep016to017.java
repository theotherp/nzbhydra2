

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigrationStep016to017 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 16;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            Map<String, Object> notificationConfig = (Map<String, Object>) toMigrate.get("notificationConfig");
            if (notificationConfig == null) {
                logger.debug("No notification config to migrate");
                return toMigrate;
            }
            if (notificationConfig.get("appriseApiUrl") != null) {
                notificationConfig.put("appriseType", "API");
            } else {
                notificationConfig.put("appriseType", "NONE");
            }
            logger.info("Setting appriseType to {}", notificationConfig.get("appriseType"));

            toMigrate.put("notificationConfig", notificationConfig);

        } catch (Exception e) {
            logger.error("Error while migrating config", e);
        }

        return toMigrate;
    }
}
