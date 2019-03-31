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

import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigrationStep006to007 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep006to007.class);

    @Override
    public int forVersion() {
        return 6;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> downloadingConfig = getFromMap(toMigrate, "downloading");
        List<Map<String, Object>> downloaders = getListFromMap(downloadingConfig, "downloaders");
        for (Map<String, Object> categoryConfig : downloaders) {
            String category = (String) categoryConfig.get("defaultCategory");
            if ("No category".equals(category)) {
                categoryConfig.put("defaultCategory", "Use original category");
            }
        }

        return toMigrate;
    }
}
