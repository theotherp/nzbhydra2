package org.nzbhydra.database;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the Flyway migrations up to V10 on an empty in-memory database, adds a search from before V2 and one with the
 * first ID of the V2 sequence and an API access with only that negative ID. Then runs V11 which restarts the sequences
 * within the integer range.
 */
class SequencesInIntegerRangeMigrationTest {

    private static final String URL = "jdbc:h2:mem:v11migrationtest;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,DATA,KEY";

    private Connection connection;

    @BeforeEach
    void setUp() throws SQLException {
        connection = DriverManager.getConnection(URL, "sa", "sa");
        flyway("10").migrate();
    }

    @AfterEach
    void tearDown() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("DROP ALL OBJECTS");
        }
        connection.close();
    }

    @Test
    void shouldRestartSequencesAboveTheHighestId() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO SEARCH (ID, TIME) VALUES (7075561, TIMESTAMP '2023-02-02 16:32:11')");
            statement.execute("INSERT INTO SEARCH (ID, TIME) VALUES (-64771072, CURRENT_TIMESTAMP)");
            statement.execute("INSERT INTO INDEXERAPIACCESS_SHORT (ID, TIME) VALUES (-64771072, CURRENT_TIMESTAMP)");
        }

        flyway("latest").migrate();

        //New searches get a higher ID than the one from before V2, so the history cleanup keeps them
        assertThat(queryLong("SELECT NEXT VALUE FOR SEARCH_SEQ")).isEqualTo(7075611L);
        assertThat(queryLong("SELECT NEXT VALUE FOR INDEXERNZBDOWNLOAD_SEQ")).isEqualTo(50L);
        //A table with only negative IDs starts at 50, above all of them
        assertThat(queryLong("SELECT NEXT VALUE FOR INDEXERAPIACCESS_SHORT_SEQ")).isEqualTo(50L);
        assertThat(queryLong("SELECT MAX(BASE_VALUE) FROM INFORMATION_SCHEMA.SEQUENCES")).isLessThanOrEqualTo(Integer.MAX_VALUE);
    }

    private Flyway flyway(String target) {
        return Flyway.configure()
            .dataSource(URL, "sa", "sa")
            .locations("classpath:migration")
            .target(target)
            .load();
    }

    private long queryLong(String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery(sql)) {
            assertThat(rs.next()).isTrue();
            return rs.getLong(1);
        }
    }
}
