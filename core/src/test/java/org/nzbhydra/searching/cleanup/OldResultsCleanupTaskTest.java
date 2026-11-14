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
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Runs the cleanup against an in-memory database migrated by Flyway.
 */
@ExtendWith(MockitoExtension.class)
class OldResultsCleanupTaskTest {

    private static final String URL = "jdbc:h2:mem:oldresultscleanuptest;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR,DATA,KEY";
    private static final Instant CUTOFF = Instant.parse("2026-11-01T12:00:00Z");

    @Mock
    private ConfigProvider configProvider;
    @Spy
    private DataSource dataSource = createDataSource();
    @InjectMocks
    private OldResultsCleanupTask testee;

    private final BaseConfig baseConfig = new BaseConfig();
    private Connection connection;
    private int nextId = 1;

    @BeforeEach
    void setUp() throws SQLException {
        connection = createDataSource().getConnection();
        Flyway.configure().dataSource(URL, "sa", "sa").locations("classpath:migration").load().migrate();
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO INDEXER (ID, NAME) VALUES (1, 'indexer')");
            statement.execute("INSERT INTO SEARCH (ID, TIME) VALUES (1, CURRENT_TIMESTAMP)");
            statement.execute("INSERT INTO INDEXERSEARCH (ID, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (1, 1, 1)");
        }
    }

    @AfterEach
    void tearDown() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("DROP ALL OBJECTS");
        }
        connection.close();
    }

    @Test
    void shouldDeleteResultsOlderThanTheConfiguredDays() throws SQLException {
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setKeepSearchResultsForDays(7);
        Instant now = Instant.now();
        insertResult(now.minus(8, ChronoUnit.DAYS));
        int recent = insertResult(now.minus(6, ChronoUnit.DAYS));

        testee.deleteOldResults();

        assertThat(ids("SEARCHRESULT")).containsExactly(recent);
        assertThat(occurrenceResultIds()).containsExactly(recent);
    }

    @Test
    void shouldKeepResultsReferencedByADownload() throws SQLException {
        int downloaded = insertResult(CUTOFF.minus(30, ChronoUnit.DAYS));
        insertResult(CUTOFF.minus(30, ChronoUnit.DAYS));
        insertDownload(downloaded);
        insertDownload(null);

        int deleted = testee.deleteResultsOlderThan(CUTOFF);

        assertThat(deleted).isEqualTo(1);
        assertThat(ids("SEARCHRESULT")).containsExactly(downloaded);
        assertThat(occurrenceResultIds()).containsExactly(downloaded);
        assertThat(ids("INDEXERNZBDOWNLOAD")).hasSize(2);
    }

    /**
     * The cutoff is compared as the UTC wall clock time of the instant, truncated to the second, exactly like the
     * former {@code DATEADD('SECOND', epochSecond, DATE '1970-01-01')}. That must not depend on the JVM's time zone.
     */
    @Test
    void shouldCompareCutoffLikeTheFormerDateAddExpressionInAnyTimeZone() throws SQLException {
        TimeZone defaultTimeZone = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));
            long epochSecond = CUTOFF.getEpochSecond();
            insertResultAtEpochSecond(epochSecond - 1);
            int atCutoff = insertResultAtEpochSecond(epochSecond);
            int oneSecondAfter = insertResultAtEpochSecond(epochSecond + 1);

            //Milliseconds of the instant are dropped like getEpochSecond() did before
            int deleted = testee.deleteResultsOlderThan(CUTOFF.plusMillis(999));

            assertThat(deleted).isEqualTo(1);
            assertThat(ids("SEARCHRESULT")).containsExactlyInAnyOrder(atCutoff, oneSecondAfter);
        } finally {
            TimeZone.setDefault(defaultTimeZone);
        }
    }

    @Test
    void shouldDeleteInSeveralBatches() throws SQLException {
        testee.batchSize = 3;
        List<Integer> expected = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            insertResult(CUTOFF.minus(1 + i, ChronoUnit.DAYS));
        }
        int downloaded = insertResult(CUTOFF.minus(2, ChronoUnit.DAYS));
        insertDownload(downloaded);
        expected.add(downloaded);
        for (int i = 0; i < 2; i++) {
            expected.add(insertResult(CUTOFF.plus(1 + i, ChronoUnit.HOURS)));
        }

        int deleted = testee.deleteResultsOlderThan(CUTOFF);

        assertThat(deleted).isEqualTo(10);
        assertThat(ids("SEARCHRESULT")).containsExactlyInAnyOrderElementsOf(expected);
        assertThat(occurrenceResultIds()).containsExactlyInAnyOrderElementsOf(expected);
    }

    @Test
    void shouldLimitEachStatementToTheBatchSize() throws SQLException {
        for (int i = 0; i < 5; i++) {
            insertResult(CUTOFF.minus(1, ChronoUnit.DAYS));
        }

        try (PreparedStatement statement = connection.prepareStatement(OldResultsCleanupTask.DELETE_SQL)) {
            statement.setObject(1, LocalDateTime.ofEpochSecond(CUTOFF.getEpochSecond(), 0, ZoneOffset.UTC));
            statement.setInt(2, 3);
            assertThat(statement.executeUpdate()).isEqualTo(3);
        }

        assertThat(ids("SEARCHRESULT")).hasSize(2);
    }

    @Test
    void shouldDeleteExactlyOneFullBatch() throws SQLException {
        testee.batchSize = 3;
        for (int i = 0; i < 3; i++) {
            insertResult(CUTOFF.minus(1, ChronoUnit.DAYS));
        }

        int deleted = testee.deleteResultsOlderThan(CUTOFF);

        assertThat(deleted).isEqualTo(3);
        assertThat(ids("SEARCHRESULT")).isEmpty();
    }

    @Test
    void shouldNotDeleteAfterShutdown() throws SQLException {
        int old = insertResult(CUTOFF.minus(1, ChronoUnit.DAYS));
        testee.handleShutdown(new ShutdownEvent());

        int deleted = testee.deleteResultsOlderThan(CUTOFF);

        assertThat(deleted).isZero();
        assertThat(ids("SEARCHRESULT")).containsExactly(old);
    }

    @Test
    void shouldNotDeleteWhenInterrupted() throws SQLException {
        int old = insertResult(CUTOFF.minus(1, ChronoUnit.DAYS));
        Thread.currentThread().interrupt();
        int deleted;
        try {
            deleted = testee.deleteResultsOlderThan(CUTOFF);
        } finally {
            //Clear the flag so that it doesn't leak into other tests
            Thread.interrupted();
        }

        assertThat(deleted).isZero();
        assertThat(ids("SEARCHRESULT")).containsExactly(old);
    }

    private int insertResult(Instant firstFound) throws SQLException {
        return insertResultAtEpochSecond(firstFound.getEpochSecond());
    }

    /**
     * Writes FIRST_FOUND with the expression the former cleanup statement compared against.
     */
    private int insertResultAtEpochSecond(long epochSecond) throws SQLException {
        int id = nextId++;
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO SEARCHRESULT (ID, HASH, FIRST_FOUND, INDEXERGUID, TITLE, INDEXER_ID) VALUES ("
                    + id + ", " + (1000 + id) + ", DATEADD('SECOND', " + epochSecond + ", DATE '1970-01-01'), 'guid" + id + "', 'title', 1)");
            statement.execute("INSERT INTO INDEXERSEARCHRESULTOCCURRENCE (ID, INDEXER_SEARCH_ID, SEARCH_RESULT_ID) VALUES (" + id + ", 1, " + id + ")");
        }
        return id;
    }

    private void insertDownload(Integer searchResultId) throws SQLException {
        int id = nextId++;
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO INDEXERNZBDOWNLOAD (ID, SEARCH_RESULT_ID, TIME) VALUES (" + id + ", " + searchResultId + ", CURRENT_TIMESTAMP)");
        }
    }

    private List<Integer> occurrenceResultIds() throws SQLException {
        return ids("INDEXERSEARCHRESULTOCCURRENCE", "SEARCH_RESULT_ID");
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
