package org.nzbhydra.web;

import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessResult;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.StatsResponse;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.web.mapping.stats.AverageResponseTime;
import org.nzbhydra.web.mapping.stats.CountPerDayOfWeek;
import org.nzbhydra.web.mapping.stats.CountPerHourOfDay;
import org.nzbhydra.web.mapping.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.web.mapping.stats.IndexerDownloadShare;
import org.nzbhydra.web.mapping.stats.IndexerSearchResultsShare;
import org.nzbhydra.web.mapping.stats.SqlCounter;
import org.nzbhydra.web.mapping.stats.StatsRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(Stats.class);

    @Autowired
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    @PersistenceContext
    private EntityManager entityManager;

    @RequestMapping(value = "/internalapi/stats")
    public StatsResponse getAllStats(@RequestBody StatsRequest statsRequest) {
        logger.debug("Request for stats from {} to {}", statsRequest.getAfter(), statsRequest.getBefore());

        StatsResponse statsResponse = new StatsResponse();
        statsResponse.setAfter(statsRequest.getAfter());
        statsResponse.setBefore(statsRequest.getBefore());

        statsResponse.setAvgResponseTimes(averageResponseTimes(statsRequest));
        statsResponse.setSearchesPerDayOfWeek(countPerDayOfWeek("SEARCH", statsRequest));
        statsResponse.setDownloadsPerDayOfWeek(countPerDayOfWeek("INDEXERNZBDOWNLOAD", statsRequest));

        statsResponse.setSearchesPerHourOfDay(countPerHourOfDay("SEARCH", statsRequest));
        statsResponse.setDownloadsPerHourOfDay(countPerHourOfDay("INDEXERNZBDOWNLOAD", statsRequest));

        statsResponse.setIndexerApiAccessStats(indexerApiAccesses(statsRequest));
        statsResponse.setIndexerDownloadShares(getIndexerDownloadShares(statsRequest));
        statsResponse.setAvgIndexerSearchResultsShares(getIndexerSearchShares(statsRequest));

        return statsResponse;
    }

    private List<IndexerDownloadShare> getIndexerDownloadShares(final StatsRequest statsRequest) {
        List<IndexerDownloadShare> indexerDownloadShares = new ArrayList<>();
        String sql = "SELECT\n" +
                "  indexer.name,\n" +
                "  count(*) AS total,\n" +
                "  countall.countall\n" +
                "FROM\n" +
                "  indexernzbdownload dl,\n" +
                "  (SELECT count(*) AS countall\n" +
                "   FROM\n" +
                "     indexernzbdownload dl\n" +
                "     LEFT OUTER JOIN indexerapiaccess api\n" +
                "       ON dl.INDEXER_API_ACCESS_ID = api.id\n" +
                "   WHERE api.indexer_id IN (:indexerIds)\n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "  )\n" +
                "  countall\n" +
                "  LEFT OUTER JOIN indexerapiaccess api\n" +
                "    ON dl.INDEXER_API_ACCESS_ID = api.id\n" +
                "  LEFT OUTER JOIN indexer indexer\n" +
                "    ON api.indexer_id = indexer.id\n" +
                "WHERE api.indexer_id IN (:indexerIds)\n" +
                "GROUP BY indexer.id, indexer.NAME, countall";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("indexerIds", searchModuleProvider.getEnabledIndexers().stream().map(x -> x.getIndexerEntity().getId()).collect(Collectors.toList()));
        List resultList = query.getResultList();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            long total = ((BigInteger) resultSet[1]).longValue();
            long countAll = ((BigInteger) resultSet[2]).longValue();
            float share = total > 0 ? (100F / ((float) countAll / total)) : 0F;
            indexerDownloadShares.add(new IndexerDownloadShare(indexerName, share));
        }

        return indexerDownloadShares;
    }

    private List<AverageResponseTime> averageResponseTimes(final StatsRequest statsRequest) {
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
                "                          WHERE INDEXER_ID IN (:indexerIds) AND RESPONSE_TIME IS NOT NULL " +
                buildWhereFromStatsRequest(true, statsRequest) +
                ") x\n" +
                "  WHERE response_time IS NOT NULL\n" +
                buildWhereFromStatsRequest(true, statsRequest) +
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

        return averageResponseTimes;
    }

    /**
     * Calculates how much of the search results indexers provide to searches on average and how much the share of unique results is. Excludes:
     * <ul>
     * <li>>raw search engines from uniqe shares because they return result names that are rarely matched as duplicates</li
     * <li>>"update queries" because here some indexers return a "total" of 1000 and some of 1000000 or something like that</li
     * <p>
     * </ul>
     *
     * @param statsRequest
     * @return
     */
    private List<IndexerSearchResultsShare> getIndexerSearchShares(final StatsRequest statsRequest) {
        List<IndexerSearchResultsShare> indexerSearchResultsShares = new ArrayList<>();
        String countResultsSql = "SELECT\n" +
                "  INDEXERRESULTSSUM,\n" +
                "  ALLRESULTSSUM,\n" +
                "  INDEXERUNIQUERESULTSSUM,\n" +
                "  ALLUNIQUERESULTSSUM\n" +
                "FROM\n" +
                "  (SELECT\n" +
                "     SUM(INDEXERSEARCH.RESULTS_COUNT)  AS INDEXERRESULTSSUM,\n" +
                "     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS INDEXERUNIQUERESULTSSUM\n" +
                "   FROM indexersearch\n" +
                "   WHERE ID IN (SELECT INDEXERSEARCH.ID\n" +
                "                FROM indexersearch\n" +
                "                  LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                  LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId\n" +
                "                      AND INDEXERSEARCH.successful AND\n" +
                "                      (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR INDEXER_ENTITY_ID IS NOT NULL) " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "                     )) FORINDEXER,\n" +
                "  (SELECT\n" +
                "     sum(INDEXERSEARCH.RESULTS_COUNT)  AS ALLRESULTSSUM,\n" +
                "     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS ALLUNIQUERESULTSSUM\n" +
                "   FROM INDEXERSEARCH\n" +
                "   WHERE INDEXERSEARCH.SEARCH_ENTITY_ID IN\n" +
                "         (SELECT INDEXERSEARCH.ID\n" +
                "          FROM INDEXERSEARCH\n" +
                "          WHERE ID IN (SELECT SEARCH.ID\n" +
                "                       FROM indexersearch\n" +
                "                         LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                         LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                       WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId\n" +
                "                             AND INDEXERSEARCH.successful AND\n" +
                "                             (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR INDEXER_ENTITY_ID IS NOT NULL) " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "                            ))) FORALL;";

        for (Indexer indexer : searchModuleProvider.getEnabledIndexers()) {
            Query countQuery = entityManager.createNativeQuery(countResultsSql);
            countQuery.setParameter("indexerId", indexer.getIndexerEntity().getId());

            Object[] resultSet = (Object[]) countQuery.getSingleResult();
            Float allShare = null;
            if (resultSet[0] != null && resultSet[1] != null) {
                BigInteger indexerResultsSum = (BigInteger) resultSet[0];
                BigInteger allResultsSum = (BigInteger) resultSet[1];
                if (indexerResultsSum.intValue() > 0) {
                    allShare = 100 / (allResultsSum.floatValue() / indexerResultsSum.floatValue());
                }
            }

            Float uniqueShare = null;
            if (resultSet[2] != null && resultSet[3] != null) {
                BigInteger indexerUniqueResultsSum = (BigInteger) resultSet[2];
                BigInteger allUniqueResultsSum = (BigInteger) resultSet[3];
                if (allUniqueResultsSum.intValue() > 0) {//TODO exclude raw engines
                    uniqueShare = 100 / (allUniqueResultsSum.floatValue() / indexerUniqueResultsSum.floatValue());
                }
            }

            indexerSearchResultsShares.add(new IndexerSearchResultsShare(indexer.getName(), allShare, uniqueShare));
        }

        return indexerSearchResultsShares;
    }


    private List<IndexerApiAccessStatsEntry> indexerApiAccesses(final StatsRequest statsRequest) {
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
                "   WHERE INDEXER_ID IN (:indexerIds) AND RESULT IN (:resultTypes)\n " +
                buildWhereFromStatsRequest(true, statsRequest) +
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

    private List<CountPerDayOfWeek> countPerDayOfWeek(final String table, final StatsRequest statsRequest) {
        String sql = "SELECT \n" +
                "  DAYOFWEEK(time) AS dayofweek, \n" +
                "  count(*)        AS counter \n" +
                "FROM " + table + " \n" +
                (table.equals("INDEXERNZBDOWNLOAD") ? " LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID \n" : "") +
                buildWhereFromStatsRequest(false, statsRequest) +
                "GROUP BY DAYOFWEEK(time)";

        List<CountPerDayOfWeek> dayOfWeekCounts = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            dayOfWeekCounts.add(new CountPerDayOfWeek(i + 1, 0));
        }
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        for (Object o : resultList) {
            Object[] resultSet = (Object[]) o;
            Integer index = (Integer) resultSet[0];
            //HSQL returns 1 for sunday, 2 for monday, etc.
            //We have the sunday in index 6, monday in index 0
            //HSQL      S   M   T   W   T   F   S
            //index     1   2   3   4   5   6   7

            //want      6   0   1   2   3   4   5
            //          S   M   T   W   T   F   S
            BigInteger counter = (BigInteger) resultSet[1];
            int indexInList = (index + 5) % 7;
            dayOfWeekCounts.get(indexInList).setCount(counter.intValue());
        }

        return dayOfWeekCounts;
    }


    private List<CountPerHourOfDay> countPerHourOfDay(final String table, final StatsRequest statsRequest) {
        String sql = "SELECT \n" +
                "  HOUR(time) AS hourofday, \n" +
                "  count(*)        AS counter \n" +
                "FROM " + table + " \n" +
                (table.equals("INDEXERNZBDOWNLOAD") ? " LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID \n" : " ") +
                buildWhereFromStatsRequest(false, statsRequest) +
                "GROUP BY HOUR(time)";

        List<CountPerHourOfDay> hourOfDayCounts = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            hourOfDayCounts.add(new CountPerHourOfDay(i, 0));
        }
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            Integer index = (Integer) o2[0];
            BigInteger counter = (BigInteger) o2[1];
            hourOfDayCounts.get(index).setCount(counter.intValue());
        }

        return hourOfDayCounts;
    }


    private String buildWhereFromStatsRequest(boolean useAnd, StatsRequest statsRequest) {
        return (useAnd ? " AND " : " WHERE ") +
                (statsRequest.getAfter() != null ? " TIME > TIMESTAMP(" + statsRequest.getAfter().getEpochSecond() + ") " : "") +
                ((statsRequest.getBefore() != null && statsRequest.getAfter() != null) ? " AND " : " ") +
                (statsRequest.getBefore() != null ? " TIME < TIMESTAMP(" + statsRequest.getBefore().getEpochSecond() + ") " : "");
    }


}
