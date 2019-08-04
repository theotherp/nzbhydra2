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

package org.nzbhydra.searching.cleanup;

import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.stream.Stream;

@Component
public class OldResultsCleanup {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private EntityManager entityManager;

    private static final Logger logger = LoggerFactory.getLogger(OldResultsCleanup.class);

    private static final long HOUR = 1000 * 60 * 60;

    @HydraTask(configId = "deleteOldSearchResults", name = "Delete old search results", interval = HOUR)
    @Transactional
    public void deleteOldResults() {
        int keepSearchResultsForDays = configProvider.getBaseConfig().getSearching().getKeepSearchResultsForDays();
        String sqlString = "delete from SEARCHRESULT where FIRST_FOUND "
                + " < DATEADD('SECOND', :epochSecond, DATE '1970-01-01') " +
                "AND ID not in (select SEARCH_RESULT_ID from INDEXERNZBDOWNLOAD where SEARCH_RESULT_ID is not null)";
        sqlString = sqlString.replace(":epochSecond", String.valueOf(Instant.now().minus(keepSearchResultsForDays, ChronoUnit.DAYS).getEpochSecond()));
        int deletedResults = entityManager.createNativeQuery(
                sqlString)
//                .setParameter("epochSecond", Instant.now().minus(keepSearchResultsForDays, ChronoUnit.DAYS).getEpochSecond())
                .executeUpdate();
        if (deletedResults > 0) {
            logger.debug("Deleted {} unused search results from database that were older than {} days", deletedResults, keepSearchResultsForDays);
        } else {
            logger.debug("No unused search results to delete");
        }

        cleanupGcLogs();
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
