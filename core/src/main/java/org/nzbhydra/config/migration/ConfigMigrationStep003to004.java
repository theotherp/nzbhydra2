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

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.UserAuthConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ConfigMigrationStep003to004 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep003to004.class);

    @Override
    public int forVersion() {
        return 3;
    }

    @Override
    public BaseConfig migrate(BaseConfig toMigrate) {
        for (UserAuthConfig user: toMigrate.getAuth().getUsers()) {
            if (user.getPassword() != null) {
                user.setPassword("{noop}" + user.getPassword());
                logger.debug("Migrated password for user {}", user.getUsername());
            }
        }
        return toMigrate;
    }
}
