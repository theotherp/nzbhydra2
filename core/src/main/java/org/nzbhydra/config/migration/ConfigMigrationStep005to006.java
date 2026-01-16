

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class ConfigMigrationStep005to006 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep005to006.class);

    @Override
    public int forVersion() {
        return 5;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> categoriesConfig = getFromMap(toMigrate, "categoriesConfig");
        List<Map<String, Object>> categories = getListFromMap(categoriesConfig, "categories");
        for (Map<String, Object> category : categories) {
            List<Integer> existingNumbers = (List<Integer>) category.get("newznabCategories");
            category.put("newznabCategories", existingNumbers.stream().map(Object::toString).collect(Collectors.toList()));
        }

        return toMigrate;
    }
}
