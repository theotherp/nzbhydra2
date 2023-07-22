/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

import java.util.List;
import java.util.Map;

public class ConfigMigrationStep019to020 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);

    @Override
    public int forVersion() {
        return 19;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        try {
            Map<String, Object> searching = getFromMap(toMigrate, "searching");
            List<Map<String, Object>> customMappings = (List<Map<String, Object>>) searching.get("customMappings");
            for (Map<String, Object> mapping : customMappings) {
                mapping.put("matchAll", "true");
            }
            searching.put("customMappings", customMappings);
            toMigrate.put("searching", searching);
        } catch (Exception e) {
            logger.error("Error while trying to set custom mappings to 'match all'", e);
        }

        return toMigrate;
    }
}
