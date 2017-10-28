package org.nzbhydra.searching;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.NzbDownloadRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class OldResultsCleanup {

    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private NzbDownloadRepository nzbDownloadRepository;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private EntityManager entityManager;

    private static final Logger logger = LoggerFactory.getLogger(OldResultsCleanup.class);

    private static final long HOUR = 1000 * 60 * 60;

    @Scheduled(initialDelay = HOUR, fixedRate = HOUR)
    @Transactional
    public void deleteOldResults() {
        int keepSearchResultsForDays = configProvider.getBaseConfig().getSearching().getKeepSearchResultsForDays();
        int deletedResults = entityManager.createNativeQuery(
                "delete from SEARCHRESULT where FIRST_FOUND "
                        + " < DATEADD('SECOND', :epochSecond, DATE '1970-01-01') " +
                        "AND ID not in (select SEARCH_RESULT_ID from INDEXERNZBDOWNLOAD  where SEARCH_RESULT_ID is not null)")
                .setParameter("epochSecond", Instant.now().minus(keepSearchResultsForDays, ChronoUnit.DAYS).getEpochSecond())
                .executeUpdate();
        if (deletedResults > 0) {
            logger.debug("Deleted {} unused search results from database that were older than {} days", deletedResults, keepSearchResultsForDays);
        }
    }

}
