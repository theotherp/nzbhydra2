package org.nzbhydra;

import org.h2.util.Profiler;

import java.io.File;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;


public class TestPerformance {

    private static Random random = new Random();

    private static final String CREATE_TABLE = "CREATE TABLE TESTTABLE\n" +
            "(\n" +
            "  ID         INTEGER PRIMARY KEY NOT NULL,\n" +
            "  ERROR      VARCHAR(4000),\n" +
            "  RESULT     VARCHAR(255),\n" +
            "  SOME_ID    INTEGER,\n" +
            "  TIME       TIMESTAMP\n" +
            ");\n" +
            "CREATE INDEX INDEX1 ON TESTTABLE (SOME_ID);\n" +
            "CREATE INDEX INDEX2 ON TESTTABLE (TIME);\n" +
            "CREATE INDEX INDEX3 ON TESTTABLE (SOME_ID, TIME);";

    public static void main(String[] args) throws Exception {
        //First query on fresh database takes about 1200ms
        //Size of new database is 160MB, size of database on which query was executed is 179MB
        testH23();

        //First query on frsh sqlite database usually takes less than 100ms
        //Size of new database is 50MB
        //testSqlite();
    }


    private static void testH2() throws Exception {
        getOrCreateTestH2Database();

        Class.forName("org.h2.Driver");
        String url = "jdbc:h2:file:./copyh2;DEFRAG_ALWAYS=TRUE";
        Connection conn = DriverManager.getConnection(url, "SA", "");

        Statement statement = conn.createStatement();

        //Warmup
        statement.executeQuery("SELECT count(*) FROM TESTTABLE");

//        Profiler prof = new Profiler();
//        prof.startCollecting();
        executeTimedQueryH2(statement);
        //prof.stopCollecting();
        statement.close();
        conn.close();
        //System.out.println(prof.getTop(3));
    }

    private static void testH23() throws Exception {
        getOrCreateTestH2Database();

        Class.forName("org.h2.Driver");
        String url = "jdbc:h2:file:C:\\Users\\strat\\IdeaProjects\\NzbHydra2\\main\\core\\data\\database\\nzbhydra;DEFRAG_ALWAYS=TRUE";
        Connection conn = DriverManager.getConnection(url, "SA", "");

        Statement statement = conn.createStatement();

        Profiler prof = new Profiler();
        prof.startCollecting();
        //Warmup
        statement.executeQuery("SELECT\n" +
                "  INDEXER_ENTITY_ID,\n" +
                "  INDEXERRESULTSSUM,\n" +
                "  ALLRESULTSSUM,\n" +
                "  INDEXERUNIQUERESULTSSUM,\n" +
                "  ALLUNIQUERESULTSSUM\n" +
                "FROM\n" +
                "  (SELECT\n" +
                "     SUM(INDEXERSEARCH.RESULTS_COUNT)  AS INDEXERRESULTSSUM,\n" +
                "     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS INDEXERUNIQUERESULTSSUM,\n" +
                "     INDEXERSEARCH.INDEXER_ENTITY_ID\n" +
                "   FROM indexersearch\n" +
                "   WHERE indexersearch.ID IN (SELECT INDEXERSEARCH.ID\n" +
                "                              FROM indexersearch\n" +
                "                                LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                              WHERE indexersearch.INDEXER_ENTITY_ID IN (48,70,1013278,60,1013268,1013290,76,1013262,54,1013280,1013266,1013288,1013286,1013284,1013272,52,1013276,82,50,1013282,1013292,62,1013294,1013296,1013274,1013264,78,1013270)\n" +
                "                                    AND INDEXERSEARCH.successful AND\n" +
                "                                    INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                                                       FROM SEARCH\n" +
                "                                                                         LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                                                       WHERE\n" +
                "                                                                         (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL OR SEARCH.AUTHOR IS NOT NULL OR SEARCH.TITLE IS NOT NULL)\n" +
                "                                                                         AND  TIME > DATEADD('SECOND', 1503650080, DATE '1970-01-01')  AND  TIME < DATEADD('SECOND', 1506328480, DATE '1970-01-01')                       )\n" +
                "   )   GROUP BY INDEXER_ENTITY_ID) FORINDEXER,\n" +
                "  (SELECT\n" +
                "     sum(INDEXERSEARCH.RESULTS_COUNT)  AS ALLRESULTSSUM,\n" +
                "     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS ALLUNIQUERESULTSSUM\n" +
                "   FROM INDEXERSEARCH\n" +
                "   WHERE INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                            FROM indexersearch\n" +
                "                                              LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                                              LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                            WHERE indexersearch.INDEXER_ENTITY_ID IN (48,70,1013278,60,1013268,1013290,76,1013262,54,1013280,1013266,1013288,1013286,1013284,1013272,52,1013276,82,50,1013282,1013292,62,1013294,1013296,1013274,1013264,78,1013270)\n" +
                "                                                  AND INDEXERSEARCH.successful AND\n" +
                "                                                  INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                                                                     FROM SEARCH\n" +
                "                                                                                       LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                                                                     WHERE\n" +
                "                                                                                       (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR\n" +
                "                                                                                        SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL OR SEARCH.AUTHOR IS NOT NULL OR SEARCH.TITLE IS NOT NULL)\n" +
                "                                                                                       AND  TIME > DATEADD('SECOND', 1503650080, DATE '1970-01-01')  AND  TIME < DATEADD('SECOND', 1506328480, DATE '1970-01-01')                                                    )\n" +
                "                                                  AND INDEXERSEARCH.successful)         AND INDEXERSEARCH.successful\n" +
                "  ) FORALL");


        prof.stopCollecting();
        statement.close();
        conn.close();
        System.out.println(prof.getTop(3));
    }

    private static void executeTimedQueryH2(Statement statement) throws SQLException {
        long before = System.currentTimeMillis();
        statement.executeQuery("SELECT\n" +
                "  SOME_ID,\n" +
                "  avg(count)\n" +
                "FROM (\n" +
                "  (SELECT\n" +
                "     SOME_ID,\n" +
                "     count(SOME_ID) AS count\n" +
                "   FROM TESTTABLE\n" +
                "   WHERE SOME_ID = " +  random.nextInt(9) +
                "   GROUP BY SOME_ID\n" +
                "     , time))\n" +
                "GROUP BY truncate(SOME_ID)");

        System.out.println("H2 querying took: " + (System.currentTimeMillis() - before));
    }

    private static void getOrCreateTestH2Database() throws ClassNotFoundException, SQLException, IOException {
        File newFile = new File("newh2.mv.db");
        if (!newFile.exists()) {
            System.out.println("Creating new test database");
            Connection conn;
            Class.forName("org.h2.Driver");
            conn = DriverManager.getConnection("jdbc:h2:file:./newh2;;DEFRAG_ALWAYS=TRUE", "SA", "");
            Statement statement = conn.createStatement();

            statement.executeUpdate(CREATE_TABLE);

            long before = System.currentTimeMillis();
            int count = 1;
            Random random = new Random();
            StringBuilder sql;
            for (int i = 0; i < 10; i++) {
                for (int j = 0; j < 20; j++) {
                    sql = new StringBuilder();
                    sql.append("insert into TESTTABLE values ");
                    List<String> values = new ArrayList<>();
                    for (int k = 0; k < 2000; k++) {
                        String date = "DATEADD('SECOND', " + ThreadLocalRandom.current().nextLong(1474265503, 1505801503) + ", DATE '1970-01-01')";
                        values.add("(" + count++ + ", '" + new BigInteger(130, random).toString(32) + "', '" + new BigInteger(130, random).toString(32) + "'," + i + "," + date + ")");
                    }
                    sql.append(join(values)).append(";");
                    statement.executeUpdate(sql.toString());
                }
            }
            statement.close();
            conn.close();

            System.out.println("Creating test data took: " + (System.currentTimeMillis() - before));
        }

        //Use a copy so we're starting off a fresh database
        File copy = new File("copyh2.mv.db");
        copy.delete();
        Files.copy(newFile.toPath(), copy.toPath());
    }

    private static String join(List<String> parts) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < parts.size() - 1; i++) {
            String part = parts.get(i);
            builder.append(part).append(", ");
        }
        return builder.append(parts.get(parts.size() - 1)).toString();
    }


/*
    private static void testSqlite() throws Exception {
        createTestSqliteDatabase();
        Class.forName("org.sqlite.JDBC");
        Connection conn = DriverManager.getConnection("jdbc:sqlite:copysqlite.db", "", "");

        Statement statement = conn.createStatement();
        //Warmup
        statement.executeQuery("SELECT count(*) FROM TESTTABLE");

        executeTimedQuerySqlite(statement);
    }

    private static void executeTimedQuerySqlite(Statement statement) throws SQLException {
        long before = System.currentTimeMillis();
        statement.executeQuery("SELECT\n" +
                "  SOME_ID,\n" +
                "  avg(count)\n" +
                "FROM (\n" +
                "  (SELECT\n" +
                "     SOME_ID,\n" +
                "     count(SOME_ID) AS count\n" +
                "   FROM TESTTABLE\n" +
                "   WHERE SOME_ID = " +  random.nextInt(9) +
                "   GROUP BY SOME_ID\n" +
                "     , date(time)))\n" +
                "GROUP BY SOME_ID");

        System.out.println("SQLite querying took: " + (System.currentTimeMillis() - before));
    }

    private static void createTestSqliteDatabase() throws ClassNotFoundException, SQLException, IOException {
        File newFile = new File("newsqlite.db");
        File copy = new File("copysqlite.db");

        if (!newFile.exists()) {
            System.out.println("Creating new test database");
            Connection conn;
            Class.forName("org.sqlite.JDBC");
            conn = DriverManager.getConnection("jdbc:sqlite:newsqlite.db", "", "");
            Statement statement = conn.createStatement();

            statement.executeUpdate(CREATE_TABLE);

            long before = System.currentTimeMillis();
            int count = 1;
            Random random = new Random();
            StringBuilder sql;
            for (int i = 0; i < 10; i++) {
                for (int j = 0; j < 20; j++) {
                    sql = new StringBuilder();
                    sql.append("insert into TESTTABLE values ");
                    List<String> values = new ArrayList<>();
                    for (int k = 0; k < 2000; k++) {
                        String date = "DATETIME(" + ThreadLocalRandom.current().nextLong(1474265503, 1505801503) + ", 'unixepoch')";
                        String randomString = new BigInteger(130, random).toString(32);
                        values.add("(" + count++ + ", '" + randomString + "', '" + randomString + "'," + i + "," + date + ")");
                    }
                    sql.append(join(values)).append(";");
                    statement.executeUpdate(sql.toString());
                }
            }

            System.out.println("Creating test data took: " + (System.currentTimeMillis() - before));
        }

        copy.delete();
        Files.copy(newFile.toPath(), copy.toPath());
    }
*/

}
