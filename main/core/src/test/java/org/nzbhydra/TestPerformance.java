package org.nzbhydra;

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
        testH2();

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
