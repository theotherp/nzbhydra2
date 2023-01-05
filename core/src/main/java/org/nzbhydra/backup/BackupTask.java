package org.nzbhydra.backup;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Component
public class BackupTask {

    private static final Logger logger = LoggerFactory.getLogger(BackupTask.class);

    private static final long HOUR = 1000 * 60 * 60;
    public static final String KEY = "BackupData";

    @Autowired
    private BackupAndRestore backupAndRestore;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ConfigProvider configProvider;
    protected Clock clock = Clock.systemUTC();

    @HydraTask(configId = "Backup", name = "Backup", interval = HOUR)
    public void createBackup() {
        boolean backupEnabled = configProvider.getBaseConfig().getMain().getBackupEveryXDays().isPresent();
        if (!backupEnabled) {
            logger.debug("Automatic backup is disabled");
            return;
        }
        int backupEveryXDays = configProvider.getBaseConfig().getMain().getBackupEveryXDays().get();

        Optional<LocalDateTime> firstStartOptional = genericStorage.get("FirstStart", LocalDateTime.class);
        if (firstStartOptional.isEmpty()) {
            logger.debug("First start date time not set (for some reason), aborting backup");
            return;
        }

        long daysSinceFirstStart = ChronoUnit.DAYS.between(firstStartOptional.get(), LocalDateTime.now(clock));
        if (daysSinceFirstStart < backupEveryXDays) {
            logger.debug("{} days since first start but backup is to be executed every {} days", daysSinceFirstStart, backupEveryXDays);
            return;
        }


        Optional<BackupData> backupData = genericStorage.get(KEY, BackupData.class);
        if (backupData.isEmpty()) {
            logger.debug("Executing first backup: {} days since first start and backup is to be executed every {} days", daysSinceFirstStart, backupEveryXDays);
            executeBackup();
            return;
        }

        long daysSinceLastBackup = ChronoUnit.DAYS.between(backupData.get().getLastBackup(), LocalDateTime.now(clock));
        if (daysSinceLastBackup >= backupEveryXDays) {
            logger.debug("Executing backup: {} days since last backup and backup is to be executed every {} days", daysSinceLastBackup, backupEveryXDays);
            executeBackup();
        }
    }

    private void executeBackup() {
        try {
            logger.info("Starting weekly backup");
            backupAndRestore.backup();
            genericStorage.save(KEY, new BackupData(LocalDateTime.now(clock)));
        } catch (Exception e) {
            logger.error("An error occured while doing a background backup", e);
        }
    }
}
