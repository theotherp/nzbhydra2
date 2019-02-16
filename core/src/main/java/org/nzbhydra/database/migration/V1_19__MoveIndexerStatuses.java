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

package org.nzbhydra.database.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class V1_19__MoveIndexerStatuses extends BaseJavaMigration {

    private static final Logger logger = LoggerFactory.getLogger(V1_19__MoveIndexerStatuses.class);


    @Override
    public void migrate(Context context) throws Exception {
        logger.info("Migrating indexer status information from config to database");
        File tempFile = new File(NzbHydra.getDataFolder(), "indexers.yaml.tmp");
        if (!tempFile.exists()) {
            logger.warn("Unable to find temporary file with indexer statuses. All indexers will be migrated as enabled");
            return;
        }
        List<Map<String, Object>> indexerConfigs = Jackson.YAML_MAPPER.readValue(tempFile, new TypeReference<List<Map<String, Object>>>() {
        });

        Connection connection = context.getConnection(); // Do not close this connection!
        for (Map<String, Object> indexer : indexerConfigs) {
            logger.debug("Migrating status for indexer {}", indexer.get("name"));
            String indexerName = (String) indexer.get("name");
            try (PreparedStatement updateStatement = connection.prepareStatement("update indexer\n" +
                    "set last_error     = ?,\n" +
                    "    disabled_until = ?,\n" +
                    "    disabled_level = ?,\n" +
                    "    state          = ?" +
                    " where NAME = ?")) {
                updateStatement.setObject(1, indexer.get("lastError"));

                Instant disabledUntilInstant = (Instant) indexer.get("disabledUntil");
                Timestamp disabledUntil = disabledUntilInstant == null ? null : Timestamp.from(disabledUntilInstant);
                updateStatement.setTimestamp(2, disabledUntil);
                updateStatement.setInt(3, (Integer) indexer.get("disabledLevel"));
                updateStatement.setObject(4, indexer.get("state"));
                updateStatement.setString(5, indexerName);
                int updatedRows = updateStatement.executeUpdate();
                if (updatedRows != 1) {
                    logger.error("Expected to change 1 row when updating indexer {} but updated {} rows", indexerName, updatedRows);
                }
            } catch (Exception e) {
                logger.error("Unable to migrate indexer status information for indexer " + indexerName + ". Indexer will be set enabled", e);
            }
        }
        tempFile.delete();

    }
}
