

package org.nzbhydra.problemdetection;

import org.apache.commons.io.filefilter.WildcardFileFilter;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class DeleteOldDatabaseBackupDetector implements ProblemDetector {

    private static final Logger logger = LoggerFactory.getLogger(DeleteOldDatabaseBackupDetector.class);


    @Override
    public void executeCheck() {
        File databaseFolder = new File(NzbHydra.getDataFolder(), "database");
        if (!databaseFolder.exists()) {
            return;
        }
        final String[] files = databaseFolder.list(new WildcardFileFilter("*.old.bak.*"));
        if (files == null) {
            return;
        }
        for (String file : files) {
            final String timeMilis = file.substring(file.lastIndexOf(".") + 1);
            final Instant creationTime = Instant.ofEpochMilli(Long.parseLong(timeMilis));
            if (creationTime.isBefore(Instant.now().minus(14, ChronoUnit.DAYS))) {
                logger.info("Found old database migration backup {}. Deleting it", file);
                new File(databaseFolder, file).delete();
            }
        }
    }


}
