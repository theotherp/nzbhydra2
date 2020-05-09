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

import java.util.Map;

@SuppressWarnings("unchecked")
public class ConfigMigrationStep008to009 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep008to009.class);

    @Override
    public int forVersion() {
        return 8;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        Map<String, Object> mainConfig = getFromMap(toMigrate, "main");
        if (mainConfig.containsKey("backupEverySunday")) {
            boolean backupEverySunday = (boolean) mainConfig.get("backupEverySunday");
            mainConfig.remove("backupEverySunday");
            mainConfig.put("backupEveryXDays", backupEverySunday ? 7 : null);
        } else if (!mainConfig.containsKey("backupEveryXDays")) {
            mainConfig.put("backupEveryXDays", 7);
        }
        return toMigrate;
    }
}
