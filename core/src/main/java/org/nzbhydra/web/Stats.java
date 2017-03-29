package org.nzbhydra.web;

import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessResult;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.web.mapping.AverageResponseTime;
import org.nzbhydra.web.mapping.CountPerDayOfWeek;
import org.nzbhydra.web.mapping.IndexerApiAccessStatsEntry;
import org.nzbhydra.web.mapping.SqlCounter;
import org.nzbhydra.web.mapping.StatsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class Stats {

    @Autowired
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    @PersistenceContext
    private EntityManager entityManager;

    @RequestMapping(value = "/internalapi/stats/averageResponseTimes")
    public List<AverageResponseTime> averageResponseTimes(@RequestBody StatsRequest statsRequest) {
        List<AverageResponseTime> averageResponseTimes = new ArrayList<>();
        String sql = "SELECT\n" +
                "  i.NAME,\n" +
                "  avgIndexerResponseTime,\n" +
                "  responseTimeDelta\n" +
                "FROM (\n" +
                "  SELECT\n" +
                "    INDEXER_ID,\n" +
                "    avg(RESPONSE_TIME)                                AS avgIndexerResponseTime,\n" +
                "    (avg(RESPONSE_TIME - overallAverageResponseTime)) AS responseTimeDelta\n" +
                "  FROM INDEXERAPIACCESS, (SELECT avg(RESPONSE_TIME) AS overallAverageResponseTime\n" +
                "                          FROM INDEXERAPIACCESS\n" +
                "                          WHERE INDEXER_ID IN (:indexerIds) AND RESPONSE_TIME IS NOT NULL) x\n" +
                "  WHERE response_time IS NOT NULL\n" +
                "  GROUP BY INDEXER_ID, overallAverageResponseTime) LEFT JOIN indexer i ON INDEXER_ID = ID\n" +
                "WHERE INDEXER_ID IN (:indexerIds)\n" +
                "ORDER BY avgIndexerResponseTime ASC NULLS LAST";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("indexerIds", searchModuleProvider.getEnabledIndexers().stream().map(x -> x.getIndexerEntity().getId()).collect(Collectors.toList()));
        List resultList = query.getResultList();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            Long averageResponseTime = ((BigInteger) resultSet[1]).longValue();
            Long delta = ((BigInteger) resultSet[2]).longValue();
            averageResponseTimes.add(new AverageResponseTime(indexerName, averageResponseTime, delta));
        }

        System.out.println("");


        return averageResponseTimes;
    }

    @RequestMapping(value = "/internalapi/stats/indexerApiAccesses")
    public List<IndexerApiAccessStatsEntry> indexerApiAccesses() {
        List<Integer> enabledIndexerIds = searchModuleProvider.getEnabledIndexers().stream().map(x -> x.getIndexerEntity().getId()).collect(Collectors.toList());
        String countByResultSql = "SELECT\n" +
                "  INDEXER.ID AS indexerid,\n" +
                "  x.counter\n" +
                "FROM INDEXER\n" +
                "  LEFT JOIN\n" +
                "  (SELECT\n" +
                "     INDEXER_ID,\n" +
                "     count(*) AS counter\n" +
                "   FROM INDEXERAPIACCESS\n" +
                "   WHERE INDEXER_ID IN (:indexerIds) AND RESULT IN (:resultTypes)\n" +
                "   GROUP BY INDEXER_ID) x ON x.INDEXER_ID = INDEXER.ID ORDER BY INDEXER_ID NULLS LAST";

        String averageIndexerAccessesPerDay = "SELECT\n" +
                "  x.INDEXER_ID AS indexerid,\n" +
                "  (sum(x.accesses) / count(x.INDEXER_ID)) AS counter\n" +
                "FROM (\n" +
                "       SELECT\n" +
                "         count(*) AS accesses,\n" +
                "         indexer_id,\n" +
                "         DAYOFYEAR(time),\n" +
                "         year(time)\n" +
                "       FROM INDEXERAPIACCESS\n" +
                "       WHERE INDEXER_ID IN (:indexerIds)\n" +
                "       GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)\n" +
                "     ) x\n" +
                "WHERE x.INDEXER_ID IN (:indexerIds)\n" +
                "GROUP BY x.INDEXER_ID ORDER BY INDEXER_ID";

        Query countQuery = entityManager.createNativeQuery(countByResultSql, SqlCounter.class);
        countQuery.setParameter("indexerIds", enabledIndexerIds);
        countQuery.setParameter("resultTypes", Arrays.asList(IndexerApiAccessResult.SUCCESSFUL.name()));

        Map<Integer, BigDecimal> successCountMap = ((List<SqlCounter>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put(i.getIndexerid(), i.getCounter()),
                HashMap::putAll);


        countQuery = entityManager.createNativeQuery(countByResultSql, SqlCounter.class);
        countQuery.setParameter("indexerIds", enabledIndexerIds);
        countQuery.setParameter("resultTypes", Arrays.asList(IndexerApiAccessResult.CONNECTION_ERROR.name()));
        Map<Integer, BigDecimal> connectionErrorCountMap = ((List<SqlCounter>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put(i.getIndexerid(), i.getCounter()),
                HashMap::putAll);

        countQuery = entityManager.createNativeQuery(countByResultSql, SqlCounter.class);
        countQuery.setParameter("indexerIds", enabledIndexerIds);
        countQuery.setParameter("resultTypes", Arrays.stream(IndexerApiAccessResult.values()).map(Enum::name).collect(Collectors.toList()));
        Map<Integer, BigDecimal> allAccessesCountMap = ((List<SqlCounter>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put(i.getIndexerid(), i.getCounter()),
                HashMap::putAll);

        countQuery = entityManager.createNativeQuery(averageIndexerAccessesPerDay, SqlCounter.class);
        countQuery.setParameter("indexerIds", enabledIndexerIds);
        Map<Integer, BigDecimal> accessesPerDayCountMap = ((List<SqlCounter>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put(i.getIndexerid(), i.getCounter()),
                HashMap::putAll);


        List<IndexerApiAccessStatsEntry> indexerApiAccessStatsEntries = new ArrayList<>();
        for (Integer id : enabledIndexerIds) {
            IndexerApiAccessStatsEntry entry = new IndexerApiAccessStatsEntry();
            entry.setIndexerName(indexerRepository.findOne(id).getName());

            if (allAccessesCountMap.containsKey(id) && allAccessesCountMap.get(id) != null) {
                if (successCountMap.get(id) != null) {
                    Double percentSuccessFul = 100D / (allAccessesCountMap.get(id).doubleValue() / successCountMap.get(id).doubleValue());
                    entry.setPercentSuccessful(percentSuccessFul);
                }

                if (connectionErrorCountMap.get(id) != null) {
                    Double percentConnectionError = 100D / (allAccessesCountMap.get(id).doubleValue() / connectionErrorCountMap.get(id).doubleValue());
                    entry.setPercentConnectionError(percentConnectionError);
                }
            }

            if (accessesPerDayCountMap.containsKey(id)) {
                entry.setAverageAccessesPerDay(accessesPerDayCountMap.get(id).intValue());
            }

            indexerApiAccessStatsEntries.add(entry);
        }

        return indexerApiAccessStatsEntries;
    }


    @RequestMapping(value = "/internalapi/stats/searchesPerDayOfWeek")
    public List<CountPerDayOfWeek> searchesPerDayOfWeek() {
        String sql = "SELECT\n" +
                "  DAYOFWEEK(time) AS dayofweek,\n" +
                "  count(*)        AS counter\n" +
                "FROM SEARCH\n" +
                "GROUP BY DAYOFWEEK(time)";

        List<CountPerDayOfWeek> dayOfWeekCounts = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            dayOfWeekCounts.add(new CountPerDayOfWeek(i + 1, 0));
        }
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            Integer index = (Integer) o2[0];
            //HSQL returns 1 for sunday, 2 for monday, etc.
            //We have the sunday in index 6, monday in index 0
            //HSQL      S   M   T   W   T   F   S
            //index     1   2   3   4   5   6   7

            //want      6   0   1   2   3   4   5
            //          S   M   T   W   T   F   S
            BigInteger counter = (BigInteger) o2[1];
            int indexInList = (index + 5) % 7;
            dayOfWeekCounts.get(indexInList).setCount(counter.intValue());
        }


        return dayOfWeekCounts;
    }

    public void apiAccessesPerDayOnAverage() {
        String sql = "select sum(c1)/count(INDEXER_ID) from (\n" +
                "  SELECT\n" +
                "    counter(*) AS c1,\n" +
                "    indexer_id,\n" +
                "    DAYOFYEAR(time),\n" +
                "    year(time)\n" +
                "  FROM INDEXERAPIACCESS\n" +
                "  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)\n" +
                ") where INDEXER_ID = 1";
    }


}
