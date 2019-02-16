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

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;

public class V1_19__MoveIndexerStatuses extends BaseJavaMigration {

    private static final Logger logger = LoggerFactory.getLogger(V1_19__MoveIndexerStatuses.class);


    @Override
    public void migrate(Context context) throws Exception {
        logger.info("Migrating indexer status information from config to database");
        BaseConfig baseConfig = new ConfigReaderWriter().loadSavedConfig();

        Connection connection = context.getConnection(); // Do not close this connection!
        for (IndexerConfig indexer : baseConfig.getIndexers()) {
            logger.debug("Migrating status for indexer {}", indexer.getName());
            String indexerName = indexer.getName();
            try (PreparedStatement updateStatement = connection.prepareStatement("update indexer\n" +
                    "set last_error     = ?,\n" +
                    "    disabled_until = ?,\n" +
                    "    disabled_level = ?,\n" +
                    "    state          = ?" +
                    " where NAME = ?")) {
                updateStatement.setObject(1, indexer.getLastError());

                Instant disabledUntilInstant = indexer.getDisabledUntil();
                Timestamp disabledUntil = disabledUntilInstant == null ? null : Timestamp.from(disabledUntilInstant);
                updateStatement.setTimestamp(2, disabledUntil);
                updateStatement.setInt(3, indexer.getDisabledLevel());
                updateStatement.setObject(4, indexer.getState().name());
                updateStatement.setString(5, indexerName);
                updateStatement.executeUpdate();
            } catch (Exception e) {
                logger.error("Unable to migrate indexer status information for indexer " + indexerName + ". Indexer will be set enabled", e);
            }
        }

    }
}
