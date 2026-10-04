

package org.nzbhydra.database;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.NzbHydra;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
@Slf4j
public class DatabaseCompactOnShutdown {


    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PreDestroy
    public void compactOnShutdown() {
        try {
            File databaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.mv.db");
            // SHUTDOWN COMPACT ignores MAX_COMPACT_TIME and rewrites the whole file, so it can take longer than databaseCompactTime
            log.info("Compacting database on shutdown. This may take a while. Size before: {}", FileUtils.byteCountToDisplaySize(FileUtils.sizeOf(databaseFile)));
            jdbcTemplate.execute("SHUTDOWN COMPACT");
            log.info("H2 database compacted successfully on shutdown. File after: {}", FileUtils.byteCountToDisplaySize(FileUtils.sizeOf(databaseFile)));
        } catch (Exception e) {
            log.error("Failed to compact H2 database on shutdown", e);
        }
    }
}
