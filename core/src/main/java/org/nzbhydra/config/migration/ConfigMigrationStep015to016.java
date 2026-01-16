

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigrationStep015to016 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 15;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            List<Map<String, Object>> indexers = (List<Map<String, Object>>) toMigrate.get("indexers");
            for (Map<String, Object> indexer : indexers) {
                final Integer score = (Integer) indexer.get("score");
                if (score == null) {
                    indexer.put("score", 0);
                }
            }
            toMigrate.put("indexers", indexers);

        } catch (Exception e) {
            logger.error("Error while migrating indexers scores", e);
        }

        return toMigrate;
    }
}
