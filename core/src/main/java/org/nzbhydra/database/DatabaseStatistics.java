package org.nzbhydra.database;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.ShutdownEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Reads H2's internal store statistics (the {@code info.*} entries of
 * {@code INFORMATION_SCHEMA.SETTINGS}) so they can be logged for debugging database file bloat.
 */
@Component
@Slf4j
public class DatabaseStatistics {

    private static final String INFO_SETTINGS_QUERY = "SELECT SETTING_NAME, SETTING_VALUE FROM INFORMATION_SCHEMA.SETTINGS WHERE SETTING_NAME LIKE 'info.%'";
    private static final long ONE_GB = 1024L * 1024 * 1024;
    private static final int LOW_FILL_RATE_THRESHOLD_PERCENT = 30;
    private static final String FILL_RATE_KEY = "info.FILL_RATE";
    private static final String CURRENT_VERSION_KEY = "info.CURRENT_VERSION";
    private static final String OLDEST_VERSION_TO_KEEP_KEY = "info.OLDEST_VERS_TO_KEEP";
    private static final List<String> MONITORED_KEYS = List.of(CURRENT_VERSION_KEY, OLDEST_VERSION_TO_KEEP_KEY,
        "info.FILE_SIZE", FILL_RATE_KEY, "info.CHUNKS_FILL_RATE", "info.CHUNK_COUNT");
    //Sessions running a statement or holding uncommitted changes, without the session running this query
    private static final String ACTIVE_SESSIONS_QUERY = "SELECT SESSION_ID, EXECUTING_STATEMENT_START, CONTAINS_UNCOMMITTED, EXECUTING_STATEMENT "
                                                        + "FROM INFORMATION_SCHEMA.SESSIONS WHERE SESSION_ID <> SESSION_ID() AND (EXECUTING_STATEMENT IS NOT NULL OR CONTAINS_UNCOMMITTED)";
    private static final int MAX_STATEMENT_LENGTH = 300;
    private static final Duration SAMPLE_INTERVAL = Duration.ofMinutes(1);
    private static final Duration PERIODIC_LOG_INTERVAL = Duration.ofHours(1);
    private static final Duration PINNED_WARN_THRESHOLD = Duration.ofMinutes(5);
    private static final Duration PINNED_WARN_REPEAT_INTERVAL = Duration.ofMinutes(30);

    private final VersionPinningTracker versionPinningTracker = new VersionPinningTracker(PINNED_WARN_THRESHOLD, PINNED_WARN_REPEAT_INTERVAL);
    private ScheduledExecutorService monitorExecutor;
    private Instant lastPeriodicLog;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * @return the H2 {@code info.*} settings, keyed by setting name, sorted alphabetically.
     */
    public Map<String, String> getInfoSettings() {
        Map<String, String> settings = new TreeMap<>();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(INFO_SETTINGS_QUERY);
            for (Map<String, Object> row : rows) {
                settings.put(String.valueOf(row.get("SETTING_NAME")), String.valueOf(row.get("SETTING_VALUE")));
            }
        } catch (Exception e) {
            log.error("Unable to read H2 database statistics", e);
        }
        return settings;
    }

    /**
     * @return a single, sorted, human-readable line containing all H2 {@code info.*} settings.
     */
    public String getSummaryLine() {
        Map<String, String> settings = getInfoSettings();
        StringBuilder sb = new StringBuilder("H2 database statistics: ");
        boolean first = true;
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            if (!first) {
                sb.append(", ");
            }
            //Spaces around the equals sign keep the log encoder from masking values of keys ending in "r" (e.g. INDEXER=...)
            sb.append(entry.getKey()).append(" = ").append(entry.getValue());
            first = false;
        }
        return sb.toString();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logStatisticsOnStartup() {
        try {
            log.info(getSummaryLine());

            long databaseFolderSize = getDatabaseFolderSize();
            String fillRateString = getInfoSettings().get(FILL_RATE_KEY);
            if (fillRateString != null && databaseFolderSize > ONE_GB) {
                try {
                    double fillRate = Double.parseDouble(fillRateString);
                    if (fillRate < LOW_FILL_RATE_THRESHOLD_PERCENT) {
                        log.warn("The database file is larger than 1 GB ({}) but only {}% full, meaning it's mostly empty space. A clean shutdown of NZBHydra (which runs SHUTDOWN COMPACT) will shrink it.", FileUtils.byteCountToDisplaySize(databaseFolderSize), fillRateString);
                    }
                } catch (NumberFormatException e) {
                    log.debug("Unable to parse {} value \"{}\"", FILL_RATE_KEY, fillRateString);
                }
            }
        } catch (Exception e) {
            log.error("Unable to log database statistics on startup", e);
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public synchronized void startMonitoring() {
        if (monitorExecutor != null) {
            return;
        }
        monitorExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "DatabaseStatistics");
            thread.setDaemon(true);
            return thread;
        });
        long intervalSeconds = SAMPLE_INTERVAL.toSeconds();
        monitorExecutor.scheduleWithFixedDelay(this::sampleSafely, intervalSeconds, intervalSeconds, TimeUnit.SECONDS);
    }

    @EventListener
    public void handleShutdown(ShutdownEvent shutdownEvent) {
        stopMonitoring();
    }

    @PreDestroy
    public synchronized void stopMonitoring() {
        if (monitorExecutor != null) {
            monitorExecutor.shutdownNow();
        }
    }

    private void sampleSafely() {
        try {
            sample(Instant.now());
        } catch (Exception e) {
            log.debug("Unable to sample H2 database statistics", e);
        }
    }

    /**
     * Logs the version and file statistics (at debug level, and once an hour at info level) and warns when H2 has not
     * been able to free space for a while because an old version is still in use.
     */
    VersionPinningTracker.Status sample(Instant now) {
        Map<String, String> settings = getInfoSettings();
        String currentVersion = settings.get(CURRENT_VERSION_KEY);
        String oldestVersionToKeep = settings.get(OLDEST_VERSION_TO_KEEP_KEY);
        if (currentVersion == null || oldestVersionToKeep == null) {
            log.debug("H2 database statistics contain no {} or {}", CURRENT_VERSION_KEY, OLDEST_VERSION_TO_KEEP_KEY);
            return null;
        }
        String monitoredLine = MONITORED_KEYS.stream()
            .filter(settings::containsKey)
            .map(key -> key + " = " + settings.get(key))
            .collect(Collectors.joining(", "));
        if (lastPeriodicLog == null || Duration.between(lastPeriodicLog, now).compareTo(PERIODIC_LOG_INTERVAL) >= 0) {
            lastPeriodicLog = now;
            log.info("H2 database versions and file: {}", monitoredLine);
        } else {
            log.debug("H2 database versions and file: {}", monitoredLine);
        }

        VersionPinningTracker.Status status;
        try {
            status = versionPinningTracker.update(Long.parseLong(currentVersion), Long.parseLong(oldestVersionToKeep), now);
        } catch (NumberFormatException e) {
            log.debug("Unable to parse {} \"{}\" or {} \"{}\"", CURRENT_VERSION_KEY, currentVersion, OLDEST_VERSION_TO_KEEP_KEY, oldestVersionToKeep);
            return null;
        }
        if (status.state() == VersionPinningTracker.State.PINNED_WARN) {
            log.warn("H2 has kept database version {} in use for at least {} while {} newer versions were written. Space freed since then can't be reused until it is released, so the database file grows. {}. Active sessions: {}",
                oldestVersionToKeep, formatDuration(status.pinnedFor()), status.versionsBehind(), monitoredLine, getActiveSessions());
        } else if (status.state() == VersionPinningTracker.State.RELEASED) {
            log.info("H2 released the old database version after about {}. {}", formatDuration(status.pinnedFor()), monitoredLine);
        }
        return status;
    }

    private String getActiveSessions() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(ACTIVE_SESSIONS_QUERY);
            if (rows.isEmpty()) {
                return "none";
            }
            return rows.stream()
                .map(row -> "[session " + row.get("SESSION_ID")
                            + ", statement started " + row.get("EXECUTING_STATEMENT_START")
                            + ", uncommitted changes " + row.get("CONTAINS_UNCOMMITTED")
                            + ": " + abbreviate(row.get("EXECUTING_STATEMENT")) + "]")
                .collect(Collectors.joining(", "));
        } catch (Exception e) {
            return "unable to read: " + e.getMessage();
        }
    }

    private static String abbreviate(Object statement) {
        String string = (statement == null ? "" : String.valueOf(statement)).replaceAll("\\s+", " ");
        return string.length() > MAX_STATEMENT_LENGTH ? string.substring(0, MAX_STATEMENT_LENGTH) + "..." : string;
    }

    private static String formatDuration(Duration duration) {
        return duration.toMinutes() + " minutes";
    }

    private long getDatabaseFolderSize() {
        File databaseFolder = new File(NzbHydra.getDataFolder(), "database");
        File[] files = databaseFolder.listFiles();
        if (files == null) {
            return 0;
        }
        long total = 0;
        for (File file : files) {
            total += file.length();
        }
        return total;
    }
}
