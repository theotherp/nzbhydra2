package org.nzbhydra.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.error.YAMLException;

import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigration {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    protected Map<String, Object> migrate(Map<String, Object> map) {
        try {
            int configVersion = (int) ((Map<String, Object>) map.get("main")).get("configVersion");
        } catch (NullPointerException | NumberFormatException e) {
            logger.error("Unable to read config version from settings file. It might be corrupt");
            throw new YAMLException("Unable to read config version from settings file. It might be corrupt");
        }

        //Keeping this as example, not needed
//        if (configVersion == 1) {
//            logger.info("Migrating config to version 2");
//            ArrayList indexers = (ArrayList) map.get("indexers");
//            ArrayList migratedIndexers = new ArrayList();
//            for (Object indexer : indexers) {
//                Map indexerMap = (Map)indexer;
//                if (Objects.equals(indexerMap.get("searchModuleType"), "TORZNAB")) {
//                    indexerMap.put("searchModuleProtocol", "TORRENT");
//                } else {
//                    indexerMap.put("searchModuleProtocol", "USENET");
//                }
//                migratedIndexers.add(indexerMap);
//            }
//            map.put("indexers", migratedIndexers);
//            ((Map<String, Object>) map.get("main")).put("configVersion", 2);
//        }
        return map;
    }

}
