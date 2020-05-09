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

package org.nzbhydra.searching.cleanup;

import com.google.common.base.Stopwatch;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.misc.Sleep;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class HistoryCleanupTask {

    private enum ASC_DESC {
        ASC,
        DESC
    }

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private DataSource dataSource;

    private static final Logger logger = LoggerFactory.getLogger(HistoryCleanupTask.class);

    private static final long HOUR = 1000 * 60 * 60;

    @HydraTask(configId = "deleteOldHistory", name = "Delete old history entries", interval = HOUR)
    public void deleteOldResults() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        Integer keepSearchResultsForWeeks = configProvider.getBaseConfig().getMain().getKeepHistoryForWeeks();
        Integer keepStatsForWeeks = configProvider.getBaseConfig().getMain().getKeepStatsForWeeks();
        boolean keepHistory = configProvider.getBaseConfig().getMain().isKeepHistory();
        boolean doDelete = keepSearchResultsForWeeks != null || keepStatsForWeeks != null || !keepHistory;
        if (!doDelete) {
            logger.debug(LoggingMarkers.HISTORY_CLEANUP, "No value set to determine how long history entries should be kept");
            return;
        }

        try (Connection connection = dataSource.getConnection()) {
            Optional<Integer> optionalHighestId;
            Instant deleteOlderThanHistory;
            if (keepHistory) {
                logger.info("Starting deletion of old history entries");
                deleteOlderThanHistory = Instant.now().minus(keepSearchResultsForWeeks * 7, ChronoUnit.DAYS);
                optionalHighestId = getIdBefore(deleteOlderThanHistory, "SEARCH", ASC_DESC.DESC, connection);
            } else {
                optionalHighestId = Optional.of(Integer.MAX_VALUE);
                deleteOlderThanHistory = Instant.now();
            }

            if (optionalHighestId.isPresent()) {
                int highestId = optionalHighestId.get();
                logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Will delete all entries for search IDs lower than {}", highestId);
                deleteOldIdentifiers(highestId, connection);

                deleteOldIndexerSearches(highestId, connection);
            }

            Instant deleteOlderThanStats;
            if (keepStatsForWeeks != null) {
                deleteOlderThanStats = Instant.now().minus(keepStatsForWeeks * 7, ChronoUnit.DAYS);
            } else {
                deleteOlderThanStats = deleteOlderThanHistory;
            }
            deleteOldIndexerApiAccesses(deleteOlderThanStats, connection);

            if (optionalHighestId.isPresent()) {
                deleteOldSearches(optionalHighestId.get(), connection);
            }

            optionalHighestId = getIdBefore(deleteOlderThanHistory, "INDEXERNZBDOWNLOAD", ASC_DESC.DESC, connection);
            if (optionalHighestId.isPresent()) {
                deleteOldDownloads(optionalHighestId.get(), connection);
            }
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
        logger.info("Deletion of old history entries finished");
        logger.debug(LoggingMarkers.PERFORMANCE, "Cleanup of history took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

    public void deleteOldIndexerSearches(Integer searchId, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old indexer searches");
        deleteOldEntries(searchId, "delete from INDEXERSEARCH where SEARCH_ENTITY_ID < ? and rownum() < 10000", "Deleted {} indexer searches from database", connection);
    }

    public void deleteOldIdentifiers(Integer searchId, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old identifiers");
        deleteOldEntries(searchId, "delete from SEARCH_IDENTIFIERS where SEARCH_ENTITY_ID < ? and rownum() < 10000", "Deleted {} search identifiers from database", connection);
        //Find the lowest searchIdentifierKey. All value pairs referencing a lower ID than that can be deleted
        int identifierId;
        try (PreparedStatement statement = connection.prepareStatement("select IDENTIFIERS_ID from SEARCH_IDENTIFIERS order by IDENTIFIERS_ID asc limit 1;")) {
            ResultSet resultSet = statement.executeQuery();
            if (!resultSet.next()) {
                logger.debug(LoggingMarkers.HISTORY_CLEANUP, "No older identifiers to delete");
                return;
            }
            identifierId = resultSet.getInt(1);

        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
            return;
        }

        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old identifier key value pairs");
        deleteOldEntries(identifierId, "delete from IDENTIFIER_KEY_VALUE_PAIR where ID < ? and rownum() < 10000", "Deleted {} identifier key value pairs from database", connection);
    }

    public void deleteOldIndexerApiAccesses(Instant deleteOlderThan, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old indexer API accesses");
        Optional<Integer> optionalId = getIdBefore(deleteOlderThan, "INDEXERAPIACCESS", ASC_DESC.DESC, connection);
        if (!optionalId.isPresent()) {
            logger.debug(LoggingMarkers.HISTORY_CLEANUP, "No older indexer API accesses to delete");
            return;
        }

        deleteOldEntries(optionalId.get(), "delete from INDEXERAPIACCESS where ID < ? and rownum() < 10000", "Deleted {} indexer API accesses from database", connection);
    }

    public void deleteOldSearches(Integer searchId, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old searches");
        deleteOldEntries(searchId, "delete from SEARCH where ID < ? and rownum() < 10000", "Deleted {} searches from database", connection);
    }

    public void deleteOldDownloads(Integer downloadId, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old downloads");
        deleteOldEntries(downloadId, "delete from indexernzbdownload where id < ? ", "Deleted {} downloads from database", connection);
        try (PreparedStatement statement = connection.prepareStatement("delete from INDEXERNZBDOWNLOAD where SEARCH_RESULT_ID is null")) {
            statement.executeUpdate();
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
    }

    @SuppressWarnings("SqlResolve")
    private Optional<Integer> getIdBefore(Instant deleteOlderThan, final String tableName, ASC_DESC ascDesc, Connection connection) {
        try (PreparedStatement statement = connection.prepareStatement("select t.id from " + tableName + " t where t.time < ? order by id " + ascDesc + " limit 1")) {
            statement.setTimestamp(1, new Timestamp(deleteOlderThan.toEpochMilli()));
            ResultSet resultSet = statement.executeQuery();
            if (!resultSet.next()) {
                logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Did not find any entry in table {} older than {}", tableName, deleteOlderThan);
                return Optional.empty();
            }
            return Optional.of(resultSet.getInt(1));
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
            return Optional.empty();
        }
    }

    public void deleteOldEntries(int lowerThan, String sql, String loggerMessage, Connection connection) {
        try {
            int deletedEntities = 0;
            int lastDeletedEntities;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                do {
                    statement.setInt(1, lowerThan);
                    lastDeletedEntities = statement.executeUpdate();
                    deletedEntities += lastDeletedEntities;
                    //Commit and sleep a bit to release locks and give the rest of the program time to read or write from or to db
                    connection.commit();
                    Sleep.sleep(20);
                    logger.debug(LoggingMarkers.HISTORY_CLEANUP, loggerMessage, deletedEntities);
                } while (lastDeletedEntities > 0);
            }
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
    }

}
