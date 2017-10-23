package org.nzbhydra;

import com.google.common.base.Stopwatch;
import lombok.Data;
import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.nzbhydra.jooq.tables.Indexer;
import org.nzbhydra.jooq.tables.Indexerapiaccess;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

import static org.jooq.impl.DSL.avg;


public class TestJooq {

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

        Class.forName("org.h2.Driver");
        String url = "jdbc:h2:file:c:/Users/strat/IdeaProjects/NzbHydra2/main/core/data/database/nzbhydra";
        Connection conn = DriverManager.getConnection(url, "SA", "");
        DSLContext create = DSL.using(conn, SQLDialect.H2);
        Stopwatch stopwatch = Stopwatch.createStarted();
        List<X> into = create.select(Indexer.INDEXER.NAME, avg(Indexerapiaccess.INDEXERAPIACCESS.RESPONSE_TIME).as("avg")).from(Indexerapiaccess.INDEXERAPIACCESS).leftJoin(Indexer.INDEXER).on(Indexerapiaccess.INDEXERAPIACCESS.INDEXER_ID.eq(Indexer.INDEXER.ID)).groupBy(Indexerapiaccess.INDEXERAPIACCESS.INDEXER_ID)
                //.orderBy(field("avg"))
                .fetch().into(X.class);
        for (X x : into) {
            System.out.println(String.format("Name. %s. Avg: %d", x.name, x.avg));
        }
        System.out.println();
        System.out.println("Took " + stopwatch.elapsed(TimeUnit.MILLISECONDS));

    }

    @Data
    private static class X{
        private String name;
        private Long avg;
    }


    /*
    List<AverageResponseTime> averageResponseTimes(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating average response times for indexers");
        List<AverageResponseTime> averageResponseTimes = new ArrayList<>();
        String sql = "SELECT\n" +
                "  NAME,\n" +
                "  avg(RESPONSE_TIME) AS avg\n" +
                "FROM INDEXERAPIACCESS\n" +
                "  LEFT JOIN indexer i ON INDEXERAPIACCESS.INDEXER_ID = i.ID\n" +
                buildWhereFromStatsRequest(false, statsRequest) +
                "GROUP BY INDEXER_ID\n" +
                "ORDER BY avg ASC";

        Query query = entityManager.createNativeQuery(sql);
        List resultList = query.getResultList();
        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        OptionalDouble overallAverage = resultList.stream().mapToLong(x -> ((BigInteger) ((Object[]) x)[1]).longValue()).average();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            if (!indexerNamesToInclude.contains(indexerName)) {
                continue;
            }
            Long averageResponseTime = ((BigInteger) resultSet[1]).longValue();
            averageResponseTimes.add(new AverageResponseTime(indexerName, averageResponseTime, averageResponseTime - overallAverage.getAsDouble()));
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated average response times for indexers. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return averageResponseTimes;
    }
     */



}
