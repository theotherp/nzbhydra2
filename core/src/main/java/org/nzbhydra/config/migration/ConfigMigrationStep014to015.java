

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigrationStep014to015 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 14;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            Map<String, Object> searching = getFromMap(toMigrate, "searching");
            List<String> userAgents = (List<String>) searching.get("userAgents");
            if (userAgents.stream().noneMatch(x -> x.toLowerCase().contains("lidarr"))) {
                userAgents.add("Lidarr");
                logger.info("Added Lidarr to known user agents");
            }
            if (userAgents.stream().noneMatch(x -> x.toLowerCase().contains("readarr"))) {
                userAgents.add("Readarr");
                logger.info("Added Readarr to known user agents");
            }
            searching.put("userAgents", userAgents);
        } catch (Exception e) {
            logger.error("Error while adding new entries to known user agents", e);
        }

        return toMigrate;
    }
}
