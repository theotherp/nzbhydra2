package org.nzbhydra.database;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.NzbHydra;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

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
