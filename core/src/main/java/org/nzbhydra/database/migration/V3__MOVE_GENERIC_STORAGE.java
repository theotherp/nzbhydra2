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

package org.nzbhydra.database.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigReaderWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.ResultSet;
import java.sql.Statement;

public class V3__MOVE_GENERIC_STORAGE extends BaseJavaMigration {

    private static final Logger logger = LoggerFactory.getLogger(V3__MOVE_GENERIC_STORAGE.class);

    @Override
    public void migrate(Context context) throws Exception {
        ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();
        BaseConfig baseConfig = configReaderWriter.loadSavedConfig();
        try (Statement statement = context.getConnection().createStatement()) {
            try (ResultSet resultSet = statement.executeQuery("select * from GENERIC_STORAGE_DATA")) {
                while (resultSet.next()) {
                    String data = resultSet.getString(2);
                    String key = resultSet.getString(3);
                    baseConfig.getGenericStorage().put(key, data);
                    logger.debug("Migrating GenericStorageData with key {}", key);
                }
            }
        }
        configReaderWriter.save(baseConfig);
        logger.info("Migrated {} GenericStorageData entries", baseConfig.getGenericStorage().size());
    }
}
