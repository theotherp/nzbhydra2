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

import org.nzbhydra.config.IndexerConfig;

import java.util.ArrayList;
import java.util.Map;

public class ConfigMigrationStep001to002 implements ConfigMigrationStep {
    @Override
    public int forVersion() {
        return 1;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> map) {
        ArrayList indexers = (ArrayList) map.get("indexers");
        ArrayList migratedIndexers = new ArrayList();
        for (Object indexer : indexers) {
            Map indexerMap = (Map) indexer;
            if ((Boolean) indexerMap.get("enabled")) {
                indexerMap.put("state", IndexerConfig.State.ENABLED.name());
            } else {
                indexerMap.put("state", IndexerConfig.State.DISABLED_USER.name());
            }
            migratedIndexers.add(indexerMap);
        }
        map.put("indexers", migratedIndexers);
        return map;
    }
}
