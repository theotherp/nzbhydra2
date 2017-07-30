package org.nzbhydra.backup;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.ChronoField;
import java.util.Optional;

@Component
public class BackupTask {

    private static final Logger logger = LoggerFactory.getLogger(BackupTask.class);

    private static final long DAY = 1000 * 60 * 60 * 24;
    public static final String KEY = "BackupData";

    @Autowired
    private BackupAndRestore backupAndRestore;
    @Autowired
    private GenericStorage<BackupData> genericStorage;

    @Autowired
    private ConfigProvider configProvider;

    @Scheduled(fixedDelay = DAY)
    public void createBackup() {
        if (configProvider.getBaseConfig().getMain().isBackupEverySunday() && LocalDateTime.now().getDayOfWeek() == DayOfWeek.SUNDAY) {
            Optional<BackupData> backupData = genericStorage.get(KEY, BackupData.class);

            if (!backupData.isPresent() || backupData.get().getLastBackup().get(ChronoField.DAY_OF_YEAR) != LocalDateTime.now().get(ChronoField.DAY_OF_YEAR)) {
                try {
                    backupAndRestore.backup();
                    genericStorage.save(KEY, new BackupData());
                } catch (Exception e) {
                    logger.error("An error occured while doing a background backup", e);
                }

            }
        }
    }
}
