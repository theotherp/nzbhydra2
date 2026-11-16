

package org.nzbhydra.searching.cleanup;

import com.google.common.base.Stopwatch;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.misc.Sleep;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;

@Component
@DependsOnDatabaseInitialization
public class HistoryCleanupTask {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private DataSource dataSource;

    private static final Logger logger = LoggerFactory.getLogger(HistoryCleanupTask.class);

    private static final long HOUR = 1000 * 60 * 60;

    //All entries are selected by their time, not by their ID. The IDs are not ordered by time: entries from before V2 have
    //positive IDs while the sequences of V2 started with values which were narrowed to negative int IDs.
    @HydraTask(configId = "deleteOldHistory", name = "Delete old history entries", interval = HOUR)
    public void deleteOldResults() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        Integer keepHistoryForWeeks = configProvider.getBaseConfig().getMain().getKeepHistoryForWeeks();
        Integer keepStatsForWeeks = configProvider.getBaseConfig().getMain().getKeepStatsForWeeks();
        boolean keepHistory = configProvider.getBaseConfig().getMain().isKeepHistory();

        //Both cutoffs are determined once so that all statements select the same entries
        Instant now = Instant.now();
        Instant deleteHistoryOlderThan;
        if (!keepHistory) {
            deleteHistoryOlderThan = now;
        } else if (keepHistoryForWeeks != null) {
            deleteHistoryOlderThan = now.minus(keepHistoryForWeeks * 7L, ChronoUnit.DAYS);
        } else {
            deleteHistoryOlderThan = null;
        }
        Instant deleteStatsOlderThan = keepStatsForWeeks != null ? now.minus(keepStatsForWeeks * 7L, ChronoUnit.DAYS) : deleteHistoryOlderThan;

        if (deleteHistoryOlderThan == null && deleteStatsOlderThan == null) {
            logger.debug(LoggingMarkers.HISTORY_CLEANUP, "No value set to determine how long history entries should be kept");
            return;
        }

        int deletedEntities = 0;
        try (Connection connection = dataSource.getConnection()) {
            if (deleteHistoryOlderThan != null) {
                logger.debug("Starting deletion of old history entries older than {}", deleteHistoryOlderThan);
                deletedEntities += deleteOldIdentifiers(deleteHistoryOlderThan, connection);
                deletedEntities += deleteOldIndexerSearches(deleteHistoryOlderThan, connection);
            }

            if (deleteStatsOlderThan != null) {
                deletedEntities += deleteOldIndexerApiAccesses(deleteStatsOlderThan, connection);
            }

            if (deleteHistoryOlderThan != null) {
                deletedEntities += deleteOldSearches(deleteHistoryOlderThan, connection);
                deletedEntities += deleteOldDownloads(deleteHistoryOlderThan, connection);
            }
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
        if (deletedEntities > 0) {
            logger.info("Deleted {} old history entries", deletedEntities);
        } else {
            logger.debug("Deletion of old history entries finished, nothing to delete");
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Cleanup of history took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

    public int deleteOldIndexerSearches(Instant deleteOlderThan, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old indexer searches");
        return deleteOldEntries("delete from INDEXERSEARCH where SEARCH_ENTITY_ID in (select ID from SEARCH where TIME < ?) and rownum() < 10000", "Deleted {} indexer searches from database", connection, deleteOlderThan);
    }

    public int deleteOldIdentifiers(Instant deleteOlderThan, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old identifiers");
        int deleted = deleteOldEntries("delete from SEARCH_IDENTIFIERS where SEARCH_ENTITY_ID in (select ID from SEARCH where TIME < ?) and rownum() < 10000", "Deleted {} search identifiers from database", connection, deleteOlderThan);
        //Key value pairs are only referenced by SEARCH_IDENTIFIERS
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old identifier key value pairs");
        return deleted + deleteOldEntries("delete from IDENTIFIER_KEY_VALUE_PAIR p where not exists (select 1 from SEARCH_IDENTIFIERS s where s.IDENTIFIERS_ID = p.ID) and rownum() < 10000", "Deleted {} identifier key value pairs from database", connection);
    }

    public int deleteOldIndexerApiAccesses(Instant deleteOlderThan, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old indexer API accesses");
        return deleteOldEntries("delete from INDEXERAPIACCESS where TIME < ? and rownum() < 10000", "Deleted {} indexer API accesses from database", connection, deleteOlderThan);
    }

    public int deleteOldSearches(Instant deleteOlderThan, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old searches");
        return deleteOldEntries("delete from SEARCH where TIME < ? and rownum() < 10000", "Deleted {} searches from database", connection, deleteOlderThan);
    }

    public int deleteOldDownloads(Instant deleteOlderThan, Connection connection) {
        logger.debug(LoggingMarkers.HISTORY_CLEANUP, "Deleting old downloads");
        int deleted = deleteOldEntries("delete from INDEXERNZBDOWNLOAD where TIME < ? and rownum() < 10000", "Deleted {} downloads from database", connection, deleteOlderThan);
        try (PreparedStatement statement = connection.prepareStatement("delete from INDEXERNZBDOWNLOAD where SEARCH_RESULT_ID is null")) {
            deleted += statement.executeUpdate();
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
        return deleted;
    }

    public int deleteOldEntries(String sql, String loggerMessage, Connection connection, Instant... deleteOlderThan) {
        int deletedEntities = 0;
        try {
            int lastDeletedEntities;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                do {
                    for (int i = 0; i < deleteOlderThan.length; i++) {
                        statement.setTimestamp(i + 1, Timestamp.from(deleteOlderThan[i]));
                    }
                    lastDeletedEntities = statement.executeUpdate();
                    deletedEntities += lastDeletedEntities;
                    //Commit and sleep a bit to release locks and give the rest of the program time to read or write from or to db
                    connection.commit();
                    Sleep.sleep(20);
                    logger.debug(LoggingMarkers.HISTORY_CLEANUP, loggerMessage, deletedEntities);
                    //Sleep keeps the interrupt flag set, stop instead of deleting on without pauses
                } while (lastDeletedEntities > 0 && !Thread.currentThread().isInterrupted());
            }
        } catch (SQLException e) {
            logger.error("Error while executing SQL", e);
        }
        return deletedEntities;
    }

}
