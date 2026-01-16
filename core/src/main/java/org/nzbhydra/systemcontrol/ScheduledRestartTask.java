

package org.nzbhydra.systemcontrol;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;

@Component
public class ScheduledRestartTask {

    private static final Logger logger = LoggerFactory.getLogger(ScheduledRestartTask.class);

    private static final long MINUTE = 1000 * 60;
    private static final String STORAGE_KEY = "ScheduledRestartData";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm");

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private SystemControl systemControl;
    @Autowired
    private GenericStorage genericStorage;

    protected Clock clock = Clock.systemDefaultZone();

    @HydraTask(configId = "ScheduledRestart", name = "Scheduled restart", interval = MINUTE)
    public void checkForScheduledRestart() {
        Optional<String> scheduledRestartTimeConfig = configProvider.getBaseConfig().getMain().getScheduledRestartTime();
        if (scheduledRestartTimeConfig.isEmpty()) {
            logger.trace("No scheduled restart time configured");
            return;
        }

        LocalTime restartTime;
        try {
            restartTime = LocalTime.parse(scheduledRestartTimeConfig.get(), TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            logger.error("Invalid scheduled restart time format: {}. Expected HH:mm format.", scheduledRestartTimeConfig.get());
            return;
        }

        LocalTime now = LocalTime.now(clock);
        LocalDate today = LocalDate.now(clock);

        // Check if we're within the restart window (same hour and minute)
        if (now.getHour() == restartTime.getHour() && now.getMinute() == restartTime.getMinute()) {
            // Check if we already restarted today
            Optional<LocalDate> lastRestartDate = genericStorage.get(STORAGE_KEY, LocalDate.class);
            if (lastRestartDate.isPresent() && lastRestartDate.get().equals(today)) {
                logger.debug("Scheduled restart already triggered today");
                return;
            }

            logger.info("Triggering scheduled restart at configured time {}", restartTime);
            genericStorage.save(STORAGE_KEY, today);
            systemControl.exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
        }
    }
}
