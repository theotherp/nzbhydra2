package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Gives every indexer, downloader and user a unique {@code id}. Masked secrets submitted by the UI are resolved against
 * the stored record with the same id instead of by name or list position.
 */
public class ConfigMigrationStep025to026 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep025to026.class);

    @Override
    public int forVersion() {
        return 25;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        int assigned = assignIds(getListFromMap(toMigrate, "indexers"));
        final Map<String, Object> downloading = getFromMap(toMigrate, "downloading");
        if (downloading != null) {
            assigned += assignIds(getListFromMap(downloading, "downloaders"));
        }
        final Map<String, Object> auth = getFromMap(toMigrate, "auth");
        if (auth != null) {
            assigned += assignIds(getListFromMap(auth, "users"));
        }
        logger.info("Assigned ids to {} indexers, downloaders and users", assigned);
        return toMigrate;
    }

    private int assignIds(List<Map<String, Object>> records) {
        if (records == null) {
            return 0;
        }
        int assigned = 0;
        final Set<String> seen = new HashSet<>();
        for (Map<String, Object> record : records) {
            if (record == null) {
                continue;
            }
            final Object id = record.get("id");
            if (!(id instanceof String idString) || idString.isEmpty() || !seen.add(idString)) {
                final String newId = UUID.randomUUID().toString();
                record.put("id", newId);
                seen.add(newId);
                assigned++;
            }
        }
        return assigned;
    }

}
