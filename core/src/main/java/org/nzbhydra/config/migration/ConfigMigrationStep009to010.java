

package org.nzbhydra.config.migration;

import java.util.ArrayList;
import java.util.Map;

public class ConfigMigrationStep009to010 implements ConfigMigrationStep {

    @Override
    public int forVersion() {
        return 9;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> authConfig = getFromMap(toMigrate, "auth");

        if (authConfig.containsKey("authHeaderIpRanges") && authConfig.get("authHeaderIpRanges") == null) {
            authConfig.put("authHeaderIpRanges", new ArrayList<>());
        }
        return toMigrate;
    }
}
