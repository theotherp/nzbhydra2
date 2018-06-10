/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Map;

public class ConfigMigrationStep002to003 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep002to003.class);

    @Override
    public int forVersion() {
        return 2;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> map) {
        ArrayList indexers = (ArrayList) map.get("indexers");
        ArrayList migratedIndexers = new ArrayList();
        for (Object indexer : indexers) {
            Map indexerMap = (Map) indexer;
            Object hitLimit = indexerMap.get("hitLimit");
            if (hitLimit != null && ((Integer) hitLimit) == 0) {
                indexerMap.remove("hitLimit");
                indexerMap.put("hitLimit", null);
                logger.debug("Set hit limit from 0 to null for indexer {}", indexerMap.get("name"));
            }
            Object downloadLimit = indexerMap.get("downloadLimit");
            if (downloadLimit != null && ((Integer) downloadLimit) == 0) {
                indexerMap.remove("downloadLimit");
                indexerMap.put("downloadLimit", null);
                logger.debug("Set download limit from 0 to null for indexer {}", indexerMap.get("name"));
            }
            migratedIndexers.add(indexerMap);
        }
        map.put("indexers", migratedIndexers);
        return map;
    }
}
