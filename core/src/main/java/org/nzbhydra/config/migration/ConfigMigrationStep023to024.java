package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ConfigMigrationStep023to024 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep023to024.class);

    @Override
    public int forVersion() {
        return 23;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {

        List<Map<String, Object>> indexers = (List<Map<String, Object>>) toMigrate.get("indexers");
        List<Map<String, Object>> newIndexers = new ArrayList<>();
        for (Map<String, Object> indexer : indexers) {
            String host = (String) indexer.get("host");
            if (host.contains("scenenzbs.com")) {
                logger.info("Migrating scenenzbs.com to treasure-maps.com");
                indexer.put("host", "https://www.treasure-maps.com");
            }
            newIndexers.add(indexer);
        }
        toMigrate.put("indexers", newIndexers);


        return toMigrate;
    }


}