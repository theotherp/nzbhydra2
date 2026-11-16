package org.nzbhydra.searching.cleanup;

import com.google.common.base.Stopwatch;
import jakarta.annotation.PreDestroy;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.File;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@Component
@DependsOnDatabaseInitialization
public class OldResultsCleanupTask {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private DataSource dataSource;

    private static final Logger logger = LoggerFactory.getLogger(OldResultsCleanupTask.class);

    private static final long HOUR = 1000 * 60 * 60;
    private static final int BATCH_SIZE = 10000;
    private static final long PAUSE_BETWEEN_BATCHES_MS = 20;

    //Results which were downloaded are kept because INDEXERNZBDOWNLOAD references them. Occurrences
    //(INDEXERSEARCHRESULTOCCURRENCE) are deleted by the foreign key's ON DELETE CASCADE.
    static final String DELETE_SQL = "delete from SEARCHRESULT r where r.FIRST_FOUND < ? "
            + "and not exists (select 1 from INDEXERNZBDOWNLOAD d where d.SEARCH_RESULT_ID = r.ID) "
            + "fetch first ? rows only";

    int batchSize = BATCH_SIZE;
    private volatile boolean shutdownRequested;

    @EventListener
    public void handleShutdown(ShutdownEvent shutdownEvent) {
        onShutdown();
    }

    @PreDestroy
    public void onShutdown() {
        shutdownRequested = true;
    }

    @HydraTask(configId = "deleteOldSearchResults", name = "Delete old search results", interval = HOUR)
    public void deleteOldResults() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        int keepSearchResultsForDays = configProvider.getBaseConfig().getSearching().getKeepSearchResultsForDays();
        Instant deleteOlderThan = Instant.now().minus(keepSearchResultsForDays, ChronoUnit.DAYS);
        try {
            int deletedResults = deleteResultsOlderThan(deleteOlderThan);
            if (deletedResults > 0) {
                logger.debug("Deleted {} unused search results from database that were older than {} days", deletedResults, keepSearchResultsForDays);
            } else {
                logger.debug("No unused search results to delete");
            }
        } catch (SQLException e) {
            logger.error("Error while deleting old search results", e);
        }

        cleanupGcLogs();
        logger.debug(LoggingMarkers.PERFORMANCE, "Cleanup of old results took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

    /**
     * Deletes the results first found before the given instant which are not referenced by a download. Each batch is
     * committed on its own so that no single long write transaction blocks the rest of the program. Stops early on
     * shutdown or interrupt; the next run continues where this one stopped.
     *
     * @return the number of deleted results
     */
    int deleteResultsOlderThan(Instant deleteOlderThan) throws SQLException {
        //FIRST_FOUND is a TIMESTAMP without time zone. The cutoff is compared as the UTC wall clock time of the instant,
        //truncated to the second, which is what DATEADD('SECOND', epochSecond, DATE '1970-01-01') produced before.
        LocalDateTime cutoff = LocalDateTime.ofEpochSecond(deleteOlderThan.getEpochSecond(), 0, ZoneOffset.UTC);
        int deletedResults = 0;
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(DELETE_SQL)) {
            statement.setObject(1, cutoff);
            statement.setInt(2, batchSize);
            int lastDeleted;
            do {
                if (isStopRequested()) {
                    logger.info("Stopping deletion of old search results after {} deleted results because of shutdown", deletedResults);
                    break;
                }
                lastDeleted = statement.executeUpdate();
                if (!connection.getAutoCommit()) {
                    connection.commit();
                }
                deletedResults += lastDeleted;
                logger.debug("Deleted {} old search results so far", deletedResults);
                if (lastDeleted == batchSize && !pauseBetweenBatches()) {
                    break;
                }
            } while (lastDeleted == batchSize);
        }
        return deletedResults;
    }

    private boolean isStopRequested() {
        return shutdownRequested || Thread.currentThread().isInterrupted();
    }

    /**
     * Gives the rest of the program time to read or write between two batches.
     *
     * @return false if the thread was interrupted
     */
    private boolean pauseBetweenBatches() {
        try {
            Thread.sleep(PAUSE_BETWEEN_BATCHES_MS);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.info("Stopping deletion of old search results because the thread was interrupted");
            return false;
        }
    }

    protected void cleanupGcLogs() {
        File[] logFiles = new File(NzbHydra.getDataFolder(), "logs").listFiles((dir, name) -> name.toLowerCase().startsWith("gclog"));
        if (logFiles == null) {
            logger.debug("No GC logs found to delete");
            return;
        }
        Stream.of(logFiles).sorted(Comparator.comparingLong(File::lastModified).reversed()).skip(5).forEach(x -> {
            try {
                logger.debug("Deleting old GC log file {}", x);
                boolean deleted = x.delete();
                if (!deleted) {
                    logger.warn("Unable to delete old GC log {}", x);
                }
            } catch (Exception e) {
                logger.warn("Unable to delete old GC log " + x + ": " + e.getMessage());
            }
        });
    }


}
