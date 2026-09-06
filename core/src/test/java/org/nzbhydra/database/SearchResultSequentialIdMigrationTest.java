package org.nzbhydra.database;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs the Flyway migrations up to V7 on an empty in-memory database, fills it with the legacy layout (hash as
 * primary key of SEARCHRESULT) and then runs V8 which switches to a sequential primary key.
 */
class SearchResultSequentialIdMigrationTest {

    private static final String URL = "jdbc:h2:mem:v8migrationtest;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,DATA,KEY";
    private static final long REFERENCED_HASH = -6738223125837923345L;
    private static final long UNREFERENCED_HASH = 8127348123123123123L;

    private Connection connection;

    @BeforeEach
    void setUp() throws SQLException {
        connection = DriverManager.getConnection(URL, "sa", "sa");
        migrateTo("7");
        insertLegacyData();
    }

    @AfterEach
    void tearDown() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("DROP ALL OBJECTS");
        }
        connection.close();
    }

    @Test
    void shouldKeepReferencedResultsWithSequentialIdAndDropTheRest() throws SQLException {
        migrateTo("latest");

        //Only the result referenced by a download survives, its old ID became its hash and it got a new small ID
        List<long[]> results = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery("SELECT ID, HASH FROM SEARCHRESULT ORDER BY ID")) {
            while (rs.next()) {
                results.add(new long[]{rs.getLong("ID"), rs.getLong("HASH")});
            }
        }
        assertThat(results).hasSize(1);
        long newId = results.get(0)[0];
        assertThat(newId).isEqualTo(1L);
        assertThat(results.get(0)[1]).isEqualTo(REFERENCED_HASH);

        //The download points to the new ID
        assertThat(queryLong("SELECT SEARCH_RESULT_ID FROM INDEXERNZBDOWNLOAD WHERE ID = 1")).isEqualTo(newId);

        //The occurrence of the surviving result was remapped, the one of the dropped result is gone
        assertThat(queryLong("SELECT COUNT(*) FROM INDEXERSEARCHRESULTOCCURRENCE")).isEqualTo(1L);
        assertThat(queryLong("SELECT SEARCH_RESULT_ID FROM INDEXERSEARCHRESULTOCCURRENCE")).isEqualTo(newId);

        //The sequence exists and continues after the IDs assigned during the migration
        assertThat(queryLong("SELECT COUNT(*) FROM INFORMATION_SCHEMA.SEQUENCES WHERE SEQUENCE_NAME = 'SEARCHRESULT_SEQ'")).isEqualTo(1L);
        assertThat(queryLong("SELECT NEXT VALUE FOR SEARCHRESULT_SEQ")).isGreaterThan(newId);

        assertThat(indexNames("SEARCHRESULT")).contains("SEARCHRESULT_HASH_INDEX", "SEARCHRESULT_FIRST_FOUND_INDEX", "UKFTFA80663URIMM78EPNXHYOM_INDEX_C");
        assertThat(queryLong("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SEARCHRESULT_NEW'")).isZero();
    }

    @Test
    void shouldCascadeDeletesThroughTheRecreatedForeignKeys() throws SQLException {
        migrateTo("latest");

        try (Statement statement = connection.createStatement()) {
            statement.execute("DELETE FROM SEARCHRESULT");
        }

        assertThat(queryLong("SELECT COUNT(*) FROM INDEXERNZBDOWNLOAD")).isZero();
        assertThat(queryLong("SELECT COUNT(*) FROM INDEXERSEARCHRESULTOCCURRENCE")).isZero();
    }

    @Test
    void shouldRejectDuplicateHashesAfterMigration() throws SQLException {
        migrateTo("latest");

        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO SEARCHRESULT (ID, HASH, INDEXERGUID, TITLE, INDEXER_ID) VALUES (NEXT VALUE FOR SEARCHRESULT_SEQ, ?, 'guid3', 'title3', 1)")) {
            statement.setLong(1, REFERENCED_HASH);
            assertThatThrownBy(statement::execute).isInstanceOf(SQLException.class);
        }
    }

    @Test
    void shouldAllowTheSameIndexerGuidWithADifferentHashAfterMigration() throws SQLException {
        //Regression: V1 created the (INDEXER_ID, INDEXERGUID) index as non-unique. Indexers (e.g. the mockserver's
        //"movies" query) may return the same GUID with a changed title, which is a different hash and must be storable.
        migrateTo("latest");

        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO SEARCHRESULT (ID, HASH, INDEXERGUID, TITLE, INDEXER_ID) VALUES (NEXT VALUE FOR SEARCHRESULT_SEQ, ?, ?, ?, 1)")) {
            statement.setLong(1, 4711L);
            statement.setString(2, "sameGuid");
            statement.setString(3, "title A");
            statement.execute();
            statement.setLong(1, 4712L);
            statement.setString(2, "sameGuid");
            statement.setString(3, "title B");
            statement.execute();
        }
        assertThat(queryLong("SELECT COUNT(*) FROM SEARCHRESULT WHERE INDEXERGUID = 'sameGuid'")).isEqualTo(2);
    }

    private void migrateTo(String target) {
        Flyway.configure()
            .dataSource(URL, "sa", "sa")
            .locations("classpath:migration")
            .target(target)
            .load()
            .migrate();
    }

    private void insertLegacyData() throws SQLException {
        Timestamp now = Timestamp.from(Instant.now());
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO INDEXER (ID, NAME) VALUES (1, 'indexer1')");
            statement.execute("INSERT INTO SEARCH (ID, TIME) VALUES (1, CURRENT_TIMESTAMP)");
            statement.execute("INSERT INTO INDEXERSEARCH (ID, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (1, 1, 1)");
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO SEARCHRESULT (ID, DETAILS, DOWNLOAD_TYPE, FIRST_FOUND, INDEXERGUID, LINK, PUB_DATE, TITLE, INDEXER_ID, INDEXERSEARCHENTITY) VALUES (?, ?, 'NZB', ?, ?, ?, ?, ?, 1, 1)")) {
            insertResult(statement, REFERENCED_HASH, "guid1", "title1", now);
            insertResult(statement, UNREFERENCED_HASH, "guid2", "title2", now);
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO INDEXERNZBDOWNLOAD (ID, STATUS, TIME, SEARCH_RESULT_ID) VALUES (1, 'NZB_ADDED', ?, ?)")) {
            statement.setTimestamp(1, now);
            statement.setLong(2, REFERENCED_HASH);
            statement.execute();
        }
        try (PreparedStatement statement = connection.prepareStatement("INSERT INTO INDEXERSEARCHRESULTOCCURRENCE (ID, INDEXER_SEARCH_ID, SEARCH_RESULT_ID) VALUES (?, 1, ?)")) {
            statement.setInt(1, 1);
            statement.setLong(2, REFERENCED_HASH);
            statement.execute();
            statement.setInt(1, 2);
            statement.setLong(2, UNREFERENCED_HASH);
            statement.execute();
        }
    }

    private void insertResult(PreparedStatement statement, long hash, String guid, String title, Timestamp now) throws SQLException {
        statement.setLong(1, hash);
        statement.setString(2, "details " + title);
        statement.setTimestamp(3, now);
        statement.setString(4, guid);
        statement.setString(5, "link " + title);
        statement.setTimestamp(6, now);
        statement.setString(7, title);
        statement.execute();
    }

    private long queryLong(String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery(sql)) {
            assertThat(rs.next()).isTrue();
            return rs.getLong(1);
        }
    }

    private List<String> indexNames(String tableName) throws SQLException {
        List<String> names = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("SELECT INDEX_NAME FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME = ?")) {
            statement.setString(1, tableName);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    names.add(rs.getString(1));
                }
            }
        }
        return names;
    }
}
