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

import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Stores indexer configs for the database migration step that transfers indexer statuses to the database. This needs to be done because the config file is loaded before the
 * database migration and the values needed for the migration are removed before the database migration can be executed. So we store them in a temporary file for the migration to read.
 */
public class ConfigMigrationStep006to007 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep006to007.class);

    @Override
    public int forVersion() {
        return 6;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        List<Map<String, Object>> indexers = getListFromMap(toMigrate, "indexers");
        try {
            Jackson.YAML_MAPPER.writeValue(new File(NzbHydra.getDataFolder(), "indexers.yaml.tmp"), indexers);
        } catch (IOException e) {
            logger.error("Unable to write indexers to temporary file. Migration of their status later will fail", e);
        }

        return toMigrate;
    }
}
