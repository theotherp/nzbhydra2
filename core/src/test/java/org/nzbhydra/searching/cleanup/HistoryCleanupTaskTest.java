package org.nzbhydra.searching.cleanup;

import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Runs the cleanup against an in-memory database migrated by Flyway. The old entries have the positive IDs of entries
 * from before V2, the new ones the negative IDs which the V2 sequences produced, so ordering by ID would get it wrong.
 */
@ExtendWith(MockitoExtension.class)
class HistoryCleanupTaskTest {

    private static final String URL = "jdbc:h2:mem:historycleanuptest;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,DATA,KEY";
    private static final int OLD_ID = 7075561;
    private static final int NEW_ID = -64771072;

    @Mock
    private ConfigProvider configProvider;
    @Spy
    private DataSource dataSource = createDataSource();
    @InjectMocks
    private HistoryCleanupTask testee;

    private final BaseConfig baseConfig = new BaseConfig();
    private Connection connection;

    @BeforeEach
    void setUp() throws SQLException {
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        connection = createDataSource().getConnection();
        Flyway.configure().dataSource(URL, "sa", "sa").locations("classpath:migration").load().migrate();
        insertHistory();
    }

    @AfterEach
    void tearDown() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("DROP ALL OBJECTS");
        }
        connection.close();
    }

    @Test
    void shouldDeleteOnlyHistoryOlderThanTheRetentionTime() throws SQLException {
        baseConfig.getMain().setKeepHistory(true);
        baseConfig.getMain().setKeepHistoryForWeeks(4);

        testee.deleteOldResults();

        assertThat(ids("SEARCH")).containsExactly(NEW_ID);
        assertThat(ids("INDEXERSEARCH")).containsExactly(NEW_ID);
        assertThat(ids("SEARCH_IDENTIFIERS", "SEARCH_ENTITY_ID")).containsExactly(NEW_ID);
        assertThat(ids("IDENTIFIER_KEY_VALUE_PAIR")).containsExactly(NEW_ID);
        assertThat(ids("INDEXERAPIACCESS")).containsExactly(NEW_ID);
        assertThat(ids("INDEXERNZBDOWNLOAD")).containsExactly(NEW_ID);
    }

    @Test
    void shouldDeleteOnlyStatsWhenNoHistoryRetentionIsSet() throws SQLException {
        baseConfig.getMain().setKeepHistory(true);
        baseConfig.getMain().setKeepHistoryForWeeks(null);
        baseConfig.getMain().setKeepStatsForWeeks(4);

        testee.deleteOldResults();

        assertThat(ids("INDEXERAPIACCESS")).containsExactly(NEW_ID);
        assertThat(ids("SEARCH")).containsExactlyInAnyOrder(OLD_ID, NEW_ID);
        assertThat(ids("INDEXERNZBDOWNLOAD")).containsExactlyInAnyOrder(OLD_ID, NEW_ID);
    }

    @Test
    void shouldDeleteAllHistoryWhenHistoryIsNotKept() throws SQLException {
        baseConfig.getMain().setKeepHistory(false);
        baseConfig.getMain().setKeepHistoryForWeeks(null);

        testee.deleteOldResults();

        assertThat(ids("SEARCH")).isEmpty();
        assertThat(ids("INDEXERSEARCH")).isEmpty();
        assertThat(ids("IDENTIFIER_KEY_VALUE_PAIR")).isEmpty();
        assertThat(ids("INDEXERAPIACCESS")).isEmpty();
        assertThat(ids("INDEXERNZBDOWNLOAD")).isEmpty();
    }

    @Test
    void shouldDoNothingWithoutRetention() throws SQLException {
        baseConfig.getMain().setKeepHistory(true);
        baseConfig.getMain().setKeepHistoryForWeeks(null);
        baseConfig.getMain().setKeepStatsForWeeks(null);

        testee.deleteOldResults();

        assertThat(ids("SEARCH")).containsExactlyInAnyOrder(OLD_ID, NEW_ID);
        assertThat(ids("INDEXERAPIACCESS")).containsExactlyInAnyOrder(OLD_ID, NEW_ID);
    }

    private void insertHistory() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO INDEXER (ID, NAME) VALUES (1, 'indexer')");
            for (int id : new int[]{OLD_ID, NEW_ID}) {
                String time = id == OLD_ID ? "TIMESTAMP '2023-02-02 16:32:11'" : "CURRENT_TIMESTAMP";
                statement.execute("INSERT INTO SEARCH (ID, TIME) VALUES (" + id + ", " + time + ")");
                statement.execute("INSERT INTO INDEXERSEARCH (ID, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (" + id + ", 1, " + id + ")");
                statement.execute("INSERT INTO IDENTIFIER_KEY_VALUE_PAIR (ID, IDENTIFIER_KEY, IDENTIFIER_VALUE) VALUES (" + id + ", 'IMDB', 'tt" + id + "')");
                statement.execute("INSERT INTO SEARCH_IDENTIFIERS (SEARCH_ENTITY_ID, IDENTIFIERS_ID) VALUES (" + id + ", " + id + ")");
                statement.execute("INSERT INTO INDEXERAPIACCESS (ID, INDEXER_ID, TIME) VALUES (" + id + ", 1, " + time + ")");
                statement.execute("INSERT INTO SEARCHRESULT (ID, HASH, INDEXERGUID, TITLE, INDEXER_ID) VALUES (" + id + ", " + id + ", 'guid" + id + "', 'title', 1)");
                statement.execute("INSERT INTO INDEXERNZBDOWNLOAD (ID, SEARCH_RESULT_ID, TIME) VALUES (" + id + ", " + id + ", " + time + ")");
            }
        }
    }

    private List<Integer> ids(String table) throws SQLException {
        return ids(table, "ID");
    }

    private List<Integer> ids(String table, String column) throws SQLException {
        List<Integer> ids = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery("SELECT " + column + " FROM " + table)) {
            while (rs.next()) {
                ids.add(rs.getInt(1));
            }
        }
        return ids;
    }

    private static DataSource createDataSource() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL(URL);
        dataSource.setUser("sa");
        dataSource.setPassword("sa");
        return dataSource;
    }
}
