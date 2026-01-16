

package org.nzbhydra.config.migration;

import java.util.List;
import java.util.Map;

public interface ConfigMigrationStep extends Comparable<ConfigMigrationStep> {

    int forVersion();

    Map<String, Object> migrate(Map<String, Object> map);

    @Override
    default int compareTo(ConfigMigrationStep o) {
        return Integer.compare(forVersion(), o.forVersion());
    }

    default Map<String, Object> getFromMap(Map<String, Object> map, String key) {
        return (Map<String, Object>)map.get(key);
    }

    default List<Map<String, Object>> getListFromMap(Map<String, Object> map, String key) {
        return (List<Map<String, Object>>) map.get(key);
    }
}
