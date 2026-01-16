

package org.nzbhydra.searching.cleanup;

import com.google.common.base.Stopwatch;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;

@Component
public class ShortIndexerApiAccessCleanup {

    @Autowired
    private IndexerApiAccessEntityShortRepository repository;

    private static final Logger logger = LoggerFactory.getLogger(ShortIndexerApiAccessCleanup.class);

    private static final long TWELVE_HOURS = 1000 * 60 * 60 * 12;

    @HydraTask(configId = "deletShortTermStorageResults", name = "Delete short term storage results", interval = TWELVE_HOURS)
    @Transactional
    public void deleteOldResults() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        int deletedResults = repository.deleteByTimeBefore(Instant.now().minus(2, ChronoUnit.DAYS));
        if (deletedResults > 0) {
            logger.debug("Deleted {} indexer API accesses from short term storage", deletedResults);
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Deletion of short term storage took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }

}
