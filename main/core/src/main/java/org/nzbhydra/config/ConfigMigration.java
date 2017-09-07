package org.nzbhydra.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConfigMigration {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    protected Map<String, Object> migrate(Map<String, Object> map) {
        @SuppressWarnings("unchecked")
        int configVersion = (int) ((Map<String, Object>) map.get("main")).get("configVersion");
        //Nothing to do yet
        return map;
    }

}
