

package org.nzbhydra.searching.cleanup;

import com.google.common.base.Stopwatch;
import jakarta.persistence.EntityManager;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@Component
public class OldResultsCleanupTask {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private EntityManager entityManager;

    private static final Logger logger = LoggerFactory.getLogger(OldResultsCleanupTask.class);

    private static final long HOUR = 1000 * 60 * 60;

    @HydraTask(configId = "deleteOldSearchResults", name = "Delete old search results", interval = HOUR)
    @Transactional
    public void deleteOldResults() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        int keepSearchResultsForDays = configProvider.getBaseConfig().getSearching().getKeepSearchResultsForDays();
        String sqlString = "delete from SEARCHRESULT where FIRST_FOUND "
                + " < DATEADD('SECOND', :epochSecond, DATE '1970-01-01') " +
                "AND ID not in (select SEARCH_RESULT_ID from INDEXERNZBDOWNLOAD where SEARCH_RESULT_ID is not null)";
        sqlString = sqlString.replace(":epochSecond", String.valueOf(Instant.now().minus(keepSearchResultsForDays, ChronoUnit.DAYS).getEpochSecond()));
        int deletedResults = entityManager.createNativeQuery(sqlString).executeUpdate();
        if (deletedResults > 0) {
            logger.debug("Deleted {} unused search results from database that were older than {} days", deletedResults, keepSearchResultsForDays);
        } else {
            logger.debug("No unused search results to delete");
        }

        cleanupGcLogs();
        logger.debug(LoggingMarkers.PERFORMANCE, "Cleanup of old results took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
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
