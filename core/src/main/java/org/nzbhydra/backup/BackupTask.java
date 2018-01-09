package org.nzbhydra.backup;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Component
public class BackupTask {

    private static final Logger logger = LoggerFactory.getLogger(BackupTask.class);

    private static final long HOUR = 1000 * 60 * 60 ;
    public static final String KEY = "BackupData";

    @Autowired
    private BackupAndRestore backupAndRestore;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ConfigProvider configProvider;
    protected Clock clock = Clock.systemUTC();

    //@Scheduled(fixedDelay = DAY)
    @HydraTask(value="Backup", interval = HOUR)
    public void createBackup() {
        boolean backupEnabled = configProvider.getBaseConfig().getMain().isBackupEverySunday();
        boolean itsSunday = LocalDateTime.now(clock).getDayOfWeek() == DayOfWeek.SUNDAY;
        Optional<LocalDateTime> firstStartOptional = genericStorage.get("FirstStart", LocalDateTime.class);
        boolean notJustInstalled = firstStartOptional.isPresent() && ChronoUnit.DAYS.between(firstStartOptional.get(), LocalDateTime.now(clock)) > 0;
        if (backupEnabled && itsSunday && notJustInstalled) {
            Optional<BackupData> backupData = genericStorage.get(KEY, BackupData.class);
            boolean lastBackupWasToday = backupData.isPresent() && ChronoUnit.DAYS.between(backupData.get().getLastBackup(), LocalDateTime.now(clock)) == 0;
            if (!lastBackupWasToday) {
                try {
                    logger.info("Starting weekly backup");
                    backupAndRestore.backup();
                    genericStorage.save(KEY, new BackupData(LocalDateTime.now(clock)));
                } catch (Exception e) {
                    logger.error("An error occured while doing a background backup", e);
                }
            }
        }
    }
}
