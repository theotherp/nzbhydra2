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

package org.nzbhydra.searching;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Component
public class HistoryCleanup {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private DataSource dataSource;

    private static final Logger logger = LoggerFactory.getLogger(HistoryCleanup.class);

    private static final long HOUR = 1000 * 60 * 60;

    @HydraTask(configId = "deleteOldHistory", name = "Delete old history entries", interval = HOUR * 24)
    public void deleteOldResults() {
        Integer keepSearchResultsForWeeks = configProvider.getBaseConfig().getSearching().getKeepHistoryForWeeks();
        if (keepSearchResultsForWeeks == null) {
            logger.debug("No value set to determine how long history entries should be kept");
            return;
        }
        logger.info("Starting deletion of old history entries");

        Instant deleteOlderThan = Instant.now().minus(keepSearchResultsForWeeks * 7, ChronoUnit.DAYS);
        Optional<Integer> optionalId = getHighestIdBefore(deleteOlderThan, "SEARCH");

        if (optionalId.isPresent()) {
            deleteOldIdentifiers(optionalId.get());

            deleteOldIndexerSearches(optionalId.get());
        }

        deleteOldIndexerApiAccesses(deleteOlderThan);

        if (optionalId.isPresent()) {
            deleteOldSearches(optionalId.get());
        }
        logger.info("Starting deletion of old history entries finished");
    }

    @Transactional
    public void deleteOldIndexerSearches(Integer searchId) {
        logger.debug("Deleting old indexer searches");
        deleteOldEntries(searchId, "delete from INDEXERSEARCH where SEARCH_ENTITY_ID < ?", "Deleted {} indexer searches from database");
    }

    @Transactional
    public void deleteOldIdentifiers(Integer searchId) {
        logger.debug("Deleting old identifiers");
        deleteOldEntries(searchId, "delete from SEARCH_IDENTIFIERS where SEARCH_ENTITY_ID < ?", "Deleted {} search identifiers from database");
        //Find the lowest searchIdentifierKey. All value pairs referencing a lower ID than that can be deleted
        int identifierId;
        try (Connection connection = dataSource.getConnection()) {
            try (PreparedStatement statement = connection.prepareStatement("select IDENTIFIERS_ID from SEARCH_IDENTIFIERS order by IDENTIFIERS_ID asc limit 1;")) {
                ResultSet resultSet = statement.executeQuery();
                if (!resultSet.next()) {
                    logger.debug("No older identifiers to delete");
                    return;
                }
                identifierId = resultSet.getInt(1);
            }
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
            return;
        }

        logger.debug("Deleting old identifier key value pairs");
        deleteOldEntries(identifierId, "delete from IDENTIFIER_KEY_VALUE_PAIR where ID < ?", "Deleted {} identifier key value pairs from database");
    }

    @Transactional
    public void deleteOldIndexerApiAccesses(Instant deleteOlderThan) {
        logger.debug("Deleting old indexer API accesses");
        Optional<Integer> optionalId = getHighestIdBefore(deleteOlderThan, "INDEXERAPIACCESS");
        if (!optionalId.isPresent()) {
            logger.debug("No older indexer API accesses to delete");
            return;
        }

        deleteOldEntries(optionalId.get(), "delete from INDEXERAPIACCESS where ID < ?", "Deleted {} indexer API accesses from database");
    }

    @Transactional
    public void deleteOldSearches(Integer searchId) {
        logger.debug("Deleting old searches");
        deleteOldEntries(searchId, "delete from SEARCH where ID < ?", "Deleted {} searches from database");
    }

    private Optional<Integer> getHighestIdBefore(Instant deleteOlderThan, final String tableName) {
        try (Connection connection = dataSource.getConnection()) {
            try (PreparedStatement statement = connection.prepareStatement("select t.id from " + tableName + " t where t.time < ? order by id desc limit 1")) {
                statement.setTimestamp(1, new Timestamp(deleteOlderThan.toEpochMilli()));
                ResultSet resultSet = statement.executeQuery();
                if (!resultSet.next()) {
                    logger.debug("Did not find any entry in table {} older than {}", tableName, deleteOlderThan);
                    return Optional.empty();
                }
                return Optional.of(resultSet.getInt(1));
            }
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
            return Optional.empty();
        }
    }

    protected void deleteOldEntries(Integer id, String sql, String loggerMessage) {
        try {
            int deletedEntities;
            try (Connection connection = dataSource.getConnection()) {
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    statement.setInt(1, id);
                    deletedEntities = statement.executeUpdate();
                }
            }
            logger.debug(loggerMessage, deletedEntities);
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
    }

}
