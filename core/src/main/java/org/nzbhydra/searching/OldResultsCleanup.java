package org.nzbhydra.searching;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.database.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class OldResultsCleanup {

    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private ConfigProvider configProvider;

    private static final Logger logger = LoggerFactory.getLogger(OldResultsCleanup.class);

    private static final long HOUR = 1000 * 60 * 60;

    @Scheduled(initialDelay = HOUR, fixedRate = HOUR)
    @Transactional
    public void deleteOldResults() {
        logger.debug("Attempting to delete old search results");
        int keepSearchResultsForDays = configProvider.getBaseConfig().getSearching().getKeepSearchResultsForDays();
        int deletedResults = searchResultRepository.deleteByFirstFoundBefore(Instant.now().minus(keepSearchResultsForDays, ChronoUnit.DAYS));
        if (deletedResults > 0) {
            logger.info("Deleted {} search results from database that were older than {} days", deletedResults, keepSearchResultsForDays);
        }
    }

}
