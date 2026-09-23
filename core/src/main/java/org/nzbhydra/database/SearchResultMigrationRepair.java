package org.nzbhydra.database;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Handles search results whose indexer no longer exists before the Flyway migrations run (see #1096).
 * <p>
 * V8__SEARCHRESULT_SEQUENTIAL_ID copies all search results referenced by a download and then adds a foreign key from
 * SEARCHRESULT.INDEXER_ID to INDEXER.ID. Some databases contain downloads whose search result belongs to an indexer
 * that was deleted, which made the foreign key and with it the migration fail. V8 itself must not be changed because
 * its checksum is recorded in all databases where it was applied successfully.
 * <p>
 * Before V8 the links from such downloads to their search results are cleared. The downloads themselves are kept.
 * <p>
 * H2 does not roll back DDL, so a database where V8 failed is left with the new layout but without the foreign keys
 * and with a failed entry in the schema history, which blocks every following start. Such a database is completed
 * here: the orphaned results are removed, the missing foreign keys are added and the history entry is marked as
 * successful.
 */
@Configuration(proxyBeanMethods = false)
@Slf4j
public class SearchResultMigrationRepair {

    private static final String ORPHANED_RESULT_IDS = "SELECT s.ID FROM SEARCHRESULT s LEFT JOIN INDEXER i ON s.INDEXER_ID = i.ID WHERE i.ID IS NULL";

    @Bean
    public FlywayMigrationStrategy searchResultRepairingMigrationStrategy() {
        return flyway -> {
            try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
                repair(connection, flyway.getConfiguration().getTable());
            } catch (SQLException e) {
                //Let flyway run anyway, it will report the actual problem if there is one
                log.error("Unable to check database for search results of deleted indexers", e);
            }
            flyway.migrate();
        };
    }

    static void repair(Connection connection, String historyTable) throws SQLException {
        if (!tableExists(connection, "SEARCHRESULT") || !tableExists(connection, "INDEXERNZBDOWNLOAD") || !tableExists(connection, historyTable)) {
            //New database
            return;
        }
        if (!columnExists(connection, "SEARCHRESULT", "HASH")) {
            clearLinksToOrphanedResults(connection);
        } else if (isV8Failed(connection, historyTable)) {
            completeFailedV8(connection, historyTable);
        }
    }

    private static void clearLinksToOrphanedResults(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            int updated = statement.executeUpdate("UPDATE INDEXERNZBDOWNLOAD SET SEARCH_RESULT_ID = NULL WHERE SEARCH_RESULT_ID IN (" + ORPHANED_RESULT_IDS + ")");
            if (updated > 0) {
                log.info("Cleared the search result of {} downloads whose indexer was deleted. The downloads are kept.", updated);
            }
        }
    }

    private static void completeFailedV8(Connection connection, String historyTable) throws SQLException {
        if (tableExists(connection, "SEARCHRESULT_NEW") || !tableExists(connection, "INDEXERSEARCHRESULTOCCURRENCE")) {
            log.warn("Database migration V8 failed at an unexpected point and cannot be completed automatically. Restore a backup of the database.");
            return;
        }
        log.info("Completing previously failed database migration V8");
        try (Statement statement = connection.createStatement()) {
            //The foreign keys are missing so the references have to be removed manually
            statement.executeUpdate("UPDATE INDEXERNZBDOWNLOAD SET SEARCH_RESULT_ID = NULL WHERE SEARCH_RESULT_ID IN (" + ORPHANED_RESULT_IDS + ")");
            statement.executeUpdate("DELETE FROM INDEXERSEARCHRESULTOCCURRENCE WHERE SEARCH_RESULT_ID IN (" + ORPHANED_RESULT_IDS + ")");
            int deleted = statement.executeUpdate("DELETE FROM SEARCHRESULT WHERE ID IN (" + ORPHANED_RESULT_IDS + ")");
            log.info("Removed {} search results of deleted indexers. Their downloads are kept.", deleted);

            //Same statements as at the end of V8, after the rename
            statement.execute("CREATE INDEX IF NOT EXISTS UKFTFA80663URIMM78EPNXHYOM_INDEX_C ON SEARCHRESULT (INDEXER_ID, INDEXERGUID)");
            statement.execute("CREATE INDEX IF NOT EXISTS SEARCHRESULT_FIRST_FOUND_INDEX ON SEARCHRESULT (FIRST_FOUND)");
            if (constraintDoesNotExist(connection, "FKR5G21PDW3HHS1SEFVJY30TGMI")) {
                statement.execute("ALTER TABLE SEARCHRESULT ADD CONSTRAINT FKR5G21PDW3HHS1SEFVJY30TGMI FOREIGN KEY (INDEXER_ID) REFERENCES INDEXER (ID) ON DELETE CASCADE");
            }
            if (constraintDoesNotExist(connection, "FKR5G21PDW3HHS1SEFKHD3HBDGL")) {
                statement.execute("ALTER TABLE INDEXERNZBDOWNLOAD ADD CONSTRAINT FKR5G21PDW3HHS1SEFKHD3HBDGL FOREIGN KEY (SEARCH_RESULT_ID) REFERENCES SEARCHRESULT (ID) ON DELETE CASCADE");
            }
            if (constraintDoesNotExist(connection, "ISRO_SEARCH_RESULT_FK")) {
                statement.execute("ALTER TABLE INDEXERSEARCHRESULTOCCURRENCE ADD CONSTRAINT ISRO_SEARCH_RESULT_FK FOREIGN KEY (SEARCH_RESULT_ID) REFERENCES SEARCHRESULT (ID) ON DELETE CASCADE");
            }
            statement.executeUpdate("UPDATE \"" + historyTable + "\" SET \"success\" = TRUE WHERE \"version\" = '8'");
        }
        log.info("Completed previously failed database migration V8");
    }

    private static boolean isV8Failed(Connection connection, String historyTable) throws SQLException {
        return count(connection, "SELECT COUNT(*) FROM \"" + historyTable + "\" WHERE \"version\" = '8' AND \"success\" = FALSE") > 0;
    }

    private static boolean tableExists(Connection connection, String tableName) throws SQLException {
        return count(connection, "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = ?", tableName) > 0;
    }

    private static boolean columnExists(Connection connection, String tableName, String columnName) throws SQLException {
        return count(connection, "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = ? AND COLUMN_NAME = ?", tableName, columnName) > 0;
    }

    private static boolean constraintDoesNotExist(Connection connection, String constraintName) throws SQLException {
        return count(connection, "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'PUBLIC' AND CONSTRAINT_NAME = ?", constraintName) <= 0;
    }

    private static long count(Connection connection, String sql, String... parameters) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < parameters.length; i++) {
                statement.setString(i + 1, parameters[i]);
            }
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        }
    }
}
