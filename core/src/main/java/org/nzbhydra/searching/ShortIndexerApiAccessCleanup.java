package org.nzbhydra.searching;

import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class ShortIndexerApiAccessCleanup {

    @Autowired
    private IndexerApiAccessEntityShortRepository repository;

    private static final Logger logger = LoggerFactory.getLogger(ShortIndexerApiAccessCleanup.class);

    private static final long TWELVE_HOURS = 1000 * 60 * 60 * 12;

    //@Scheduled(initialDelay = 1000 * 60, fixedRate = TWELVE_HOURS)
    @HydraTask(configId = "deletShortTermStorageResults", name = "Delete short term storage results", interval = TWELVE_HOURS)
    @Transactional
    public void deleteOldResults() {
        int deletedResults = repository.deleteByTimeBefore(Instant.now().minus(2, ChronoUnit.DAYS));
        if (deletedResults > 0) {
            logger.debug("Deleted {} indexer API accesses from short term storage", deletedResults);
        }
    }

}
