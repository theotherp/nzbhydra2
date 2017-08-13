package org.nzbhydra.historystats;

import com.google.common.base.Stopwatch;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.HistoryUserInfoType;
import org.nzbhydra.historystats.stats.AverageResponseTime;
import org.nzbhydra.historystats.stats.CountPerDayOfWeek;
import org.nzbhydra.historystats.stats.CountPerHourOfDay;
import org.nzbhydra.historystats.stats.DownloadOrSearchSharePerUserOrIp;
import org.nzbhydra.historystats.stats.DownloadPerAge;
import org.nzbhydra.historystats.stats.DownloadPerAgeStats;
import org.nzbhydra.historystats.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.historystats.stats.IndexerDownloadShare;
import org.nzbhydra.historystats.stats.IndexerSearchResultsShare;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.historystats.stats.SuccessfulDownloadsPerIndexer;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerAccessResult;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.searching.SearchModuleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
public class Stats {

    private static final Logger logger = LoggerFactory.getLogger(Stats.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    @PersistenceContext
    private EntityManager entityManager;

    public StatsResponse getAllStats(StatsRequest statsRequest) throws InterruptedException {

        logger.debug("Request for stats between {} and {}", statsRequest.getAfter(), statsRequest.getBefore());

        StatsResponse statsResponse = new StatsResponse();
        statsResponse.setAfter(statsRequest.getAfter());
        statsResponse.setBefore(statsRequest.getBefore());

        int numberOfThreads = Math.max(Runtime.getRuntime().availableProcessors() - 1, 1);
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        logger.debug("Starting stats calculation with {} threads", numberOfThreads);

        executor.submit(() -> statsResponse.setAvgResponseTimes(averageResponseTimes(statsRequest)));

        executor.submit(() -> statsResponse.setSearchesPerDayOfWeek(countPerDayOfWeek("SEARCH", statsRequest)));
        executor.submit(() -> statsResponse.setDownloadsPerDayOfWeek(countPerDayOfWeek("INDEXERNZBDOWNLOAD", statsRequest)));

        executor.submit(() -> statsResponse.setSearchesPerHourOfDay(countPerHourOfDay("SEARCH", statsRequest)));
        executor.submit(() -> statsResponse.setDownloadsPerHourOfDay(countPerHourOfDay("INDEXERNZBDOWNLOAD", statsRequest)));

        executor.submit(() -> statsResponse.setIndexerApiAccessStats(indexerApiAccesses(statsRequest)));
        executor.submit(() -> statsResponse.setIndexerDownloadShares(indexerDownloadShares(statsRequest)));

        executor.submit(() -> statsResponse.setAvgIndexerSearchResultsShares(indexerSearchShares(statsRequest)));

        executor.submit(() -> statsResponse.setDownloadsPerAge(downloadsPerAge()));
        executor.submit(() -> statsResponse.setDownloadsPerAgeStats(downloadsPerAgeStats()));

        executor.submit(() -> statsResponse.setSuccessfulDownloadsPerIndexer(successfulDownloadsPerIndexer(statsRequest)));

        if (configProvider.getBaseConfig().getMain().getLogging().getHistoryUserInfoType() != HistoryUserInfoType.NONE) {
            executor.submit(() -> statsResponse.setDownloadSharesPerUserOrIp(downloadsOrSearchesPerUserOrIp(statsRequest, "INDEXERNZBDOWNLOAD")));
            executor.submit(() -> statsResponse.setSearchSharesPerUserOrIp(downloadsOrSearchesPerUserOrIp(statsRequest, "SEARCH")));
        }

        executor.shutdown();
        boolean wasCompleted = executor.awaitTermination(30, TimeUnit.SECONDS);
        if (!wasCompleted) {
            throw new RuntimeException("The stats calculation took longer than 30 seconds");
        }

        statsResponse.setNumberOfConfiguredIndexers(searchModuleProvider.getIndexers().size());
        statsResponse.setNumberOfEnabledIndexers(searchModuleProvider.getEnabledIndexers().size());

        return statsResponse;
    }

    List<IndexerDownloadShare> indexerDownloadShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        if (searchModuleProvider.getEnabledIndexers().size() == 0 && !statsRequest.isIncludeDisabled()) {
            logger.warn("Unable to generate any stats without any enabled indexers");
            return Collections.emptyList();
        }

        List<IndexerDownloadShare> indexerDownloadShares = new ArrayList<>();
        String sql =
                "SELECT\n" +
                        "  indexer.name,\n" +
                        "  count(*) AS total,\n" +
                        "  countall.countall\n" +
                        "FROM\n" +
                        "  indexernzbdownload dl,\n" +
                        "  (SELECT count(*) AS countall\n" +
                        "   FROM\n" +
                        "     indexernzbdownload dl\n" +
                        "   WHERE dl.indexer_id IN (:indexerIds)\n" +
                        buildWhereFromStatsRequest(true, statsRequest) +
                        ")\n" +
                        "  countall\n" +
                        "  , INDEXER\n" +
                        "WHERE dl.indexer_id IN (:indexerIds)\n" +
                        buildWhereFromStatsRequest(true, statsRequest) +
                        "      AND dl.INDEXER_ID = indexer.ID\n" +
                        "GROUP BY\n" +
                        "  dl.INDEXER_ID";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("indexerIds", searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(x -> x.getIndexerEntity().getId()).collect(Collectors.toList()));
        List resultList = query.getResultList();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            long total = ((BigInteger) resultSet[1]).longValue();
            long countAll = ((BigInteger) resultSet[2]).longValue();
            float share = total > 0 ? (100F / ((float) countAll / total)) : 0F;
            indexerDownloadShares.add(new IndexerDownloadShare(indexerName, share));
        }
        logger.debug("Calculated indexer download shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerDownloadShares;
    }

    List<AverageResponseTime> averageResponseTimes(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
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
        query.setParameter("indexerIds", searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(x -> x.getIndexerEntity().getId()).collect(Collectors.toList()));
        List resultList = query.getResultList();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            Long averageResponseTime = ((BigInteger) resultSet[1]).longValue();
            Long delta = ((BigInteger) resultSet[2]).longValue();
            averageResponseTimes.add(new AverageResponseTime(indexerName, averageResponseTime, delta));
        }
        logger.debug("Calculated average response times for indexers. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return averageResponseTimes;
    }

    /**
     * Calculates how much of the search results indexers provide to searches on average and how much the share of unique results is. Excludes:
     * <ul>
     * <li>raw search engines from uniqe shares because they return result names that are rarely matched as duplicates</li>
     * <li>"update queries" because here some indexers return a "total" of 1000 and some of 1000000 or something like that</li>
     * <p>
     * </ul>
     *
     * @param statsRequest
     * @return
     */
    List<IndexerSearchResultsShare> indexerSearchShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
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
                "   WHERE indexersearch.ID IN (SELECT INDEXERSEARCH.ID\n" +
                "                FROM indexersearch\n" +
                "                  LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId\n" +
                "                      AND INDEXERSEARCH.successful AND\n" +
                "                      INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                                         FROM SEARCH\n" +
                "                                                           LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                                         WHERE\n" +
                "                                                           (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL OR SEARCH.AUTHOR IS NOT NULL OR SEARCH.TITLE IS NOT NULL) \n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "                      )\n" +
                "   )) FORINDEXER,\n" +
                "  (SELECT\n" +
                "     sum(INDEXERSEARCH.RESULTS_COUNT)  AS ALLRESULTSSUM,\n" +
                "     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS ALLUNIQUERESULTSSUM\n" +
                "   FROM INDEXERSEARCH\n" +
                "   WHERE INDEXERSEARCH.ID IN\n" +
                "         (SELECT INDEXERSEARCH.ID\n" +
                "          FROM INDEXERSEARCH\n" +
                "          WHERE INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                       FROM indexersearch\n" +
                "                         LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                         LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                       WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId\n" +
                "                             AND INDEXERSEARCH.successful AND\n" +
                "                             INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                                                FROM SEARCH\n" +
                "                                                                  LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                                                WHERE\n" +
                "                                                           (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL OR SEARCH.AUTHOR IS NOT NULL OR SEARCH.TITLE IS NOT NULL) \n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "          )) AND INDEXERSEARCH.successful\n" +
                "         )) FORALL";

        List<Indexer> indexersToInclude = statsRequest.isIncludeDisabled() ? searchModuleProvider.getIndexers() : searchModuleProvider.getEnabledIndexers();
        for (Indexer indexer : indexersToInclude) {
            Query countQuery = entityManager.createNativeQuery(countResultsSql).setParameter("indexerId", indexer.getIndexerEntity().getId());

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
        logger.debug("Calculated indexer search shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerSearchResultsShares;
    }


    List<IndexerApiAccessStatsEntry> indexerApiAccesses(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        List<Integer> indexerIdsToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(x -> x.getIndexerEntity().getId()).filter(id -> indexerRepository.findOne(id) != null).collect(Collectors.toList());
        String countByResultSql = "SELECT \n" +
                "  INDEXER.ID AS indexerid,\n" +
                "  x.counter as counter \n" +
                "FROM INDEXER \n" +
                "  LEFT JOIN \n" +
                "  (SELECT \n" +
                "     INDEXER_ID,\n" +
                "     count(*) AS counter \n" +
                "   FROM INDEXERAPIACCESS \n" +
                "   WHERE INDEXER_ID IN (:indexerIds) AND RESULT IN (:resultTypes) \n " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "   GROUP BY INDEXER_ID) x ON x.INDEXER_ID = INDEXER.ID ORDER BY INDEXER_ID NULLS LAST";

        String averageIndexerAccessesPerDay = "SELECT\n" +
                "  indexer_id,\n" +
                "  avg(accesses) AS accessesPerDay\n" +
                "FROM (\n" +
                "  SELECT\n" +
                "    indexer_id,\n" +
                "    CAST(count(*) AS FLOAT) AS accesses,\n" +
                "    DAYOFYEAR(time),\n" +
                "    year(time)\n" +
                "  FROM INDEXERAPIACCESS,\n" +
                "    (select indexer_id as id2, min(time) as mintime from INDEXERAPIACCESS GROUP BY INDEXER_ID)\n" +
                "  WHERE  (TIME > mintime AND INDEXER_ID = id2)\n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)\n" +
                ")\n" +
                "WHERE INDEXER_ID IN (:indexerIds)\n" +
                "GROUP BY INDEXER_ID\n" +
                "ORDER BY INDEXER_ID NULLS LAST";

        Query countQuery = entityManager.createNativeQuery(countByResultSql);
        countQuery.setParameter("indexerIds", indexerIdsToInclude);
        countQuery.setParameter("resultTypes", Arrays.asList(IndexerAccessResult.SUCCESSFUL.name()));

        Map<Integer, BigInteger> successCountMap = ((List<Object[]>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put((Integer) i[0], (BigInteger) i[1]),
                HashMap::putAll);


        countQuery = entityManager.createNativeQuery(countByResultSql);
        countQuery.setParameter("indexerIds", indexerIdsToInclude);
        countQuery.setParameter("resultTypes", Arrays.asList(IndexerAccessResult.CONNECTION_ERROR.name()));
        Map<Integer, BigInteger> connectionErrorCountMap = ((List<Object[]>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put((Integer) i[0], (BigInteger) i[1]),
                HashMap::putAll);

        countQuery = entityManager.createNativeQuery(countByResultSql);
        countQuery.setParameter("indexerIds", indexerIdsToInclude);
        countQuery.setParameter("resultTypes", Arrays.stream(IndexerAccessResult.values()).map(Enum::name).collect(Collectors.toList()));
        Map<Integer, BigInteger> allAccessesCountMap = ((List<Object[]>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put((Integer) i[0], (BigInteger) i[1]),
                HashMap::putAll);

        countQuery = entityManager.createNativeQuery(averageIndexerAccessesPerDay);
        countQuery.setParameter("indexerIds", indexerIdsToInclude);
        Map<Integer, Double> accessesPerDayCountMap = ((List<Object[]>) countQuery.getResultList()).stream().collect(HashMap::new,
                (map, i) -> map.put((Integer) i[0], (Double) i[1]),
                HashMap::putAll);


        List<IndexerApiAccessStatsEntry> indexerApiAccessStatsEntries = new ArrayList<>();
        for (Integer id : indexerIdsToInclude) {
            IndexerApiAccessStatsEntry entry = new IndexerApiAccessStatsEntry();
            IndexerEntity indexerEntity = indexerRepository.findOne(id);
            entry.setIndexerName(indexerEntity.getName());

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

            if (accessesPerDayCountMap.containsKey(id) && accessesPerDayCountMap.get(id) != null) {
                entry.setAverageAccessesPerDay(accessesPerDayCountMap.get(id));
            }

            indexerApiAccessStatsEntries.add(entry);
        }
        logger.debug("Calculated indexer API stats. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerApiAccessStatsEntries;
    }

    List<CountPerDayOfWeek> countPerDayOfWeek(final String table, final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        String sql = "SELECT \n" +
                "  DAYOFWEEK(time) AS dayofweek, \n" +
                "  count(*)        AS counter \n" +
                "FROM " + table + " \n" +
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
        logger.debug("Calculated count of day for table {}. Took {}ms", table, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return dayOfWeekCounts;
    }


    List<CountPerHourOfDay> countPerHourOfDay(final String table, final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        String sql = "SELECT \n" +
                "  HOUR(time) AS hourofday, \n" +
                "  count(*)        AS counter \n" +
                "FROM " + table + " \n" +
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

        logger.debug("Calculated count for hour of day for table {}. Took {}ms", table, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return hourOfDayCounts;
    }

    List<SuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        String sql = "SELECT  INDEXER.name, 100/((CAST((count_error+ count_success) as float))/count_success) as percent\n" +
                "from\n" +
                "  (select indexer_id as id_1, count(*)as count_error from INDEXERNZBDOWNLOAD  WHERE INDEXER_ID IN (:indexerIds) AND status in ('CONTENT_DOWNLOAD_ERROR', 'CONTENT_DOWNLOAD_WARNING') " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "GROUP BY INDEXER_ID),\n" +
                "  (select indexer_id as id_2, count(*)as count_success from INDEXERNZBDOWNLOAD WHERE INDEXER_ID IN (:indexerIds) AND  status ='CONTENT_DOWNLOAD_SUCCESSFUL' " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "GROUP BY INDEXER_ID) " +
                ",INDEXER where id_1 = id_2 and id_1 = INDEXER.ID";
        Query query = entityManager.createNativeQuery(sql);
        List<Integer> indexerIdsToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(x -> x.getIndexerEntity().getId()).filter(id -> indexerRepository.findOne(id) != null).collect(Collectors.toList());
        query.setParameter("indexerIds", indexerIdsToInclude);
        List<Object> resultList = query.getResultList();
        List<SuccessfulDownloadsPerIndexer> result = new ArrayList<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String indexerName = (String) o2[0];
            Double percentSuccessful = (Double) o2[1];
            result.add(new SuccessfulDownloadsPerIndexer(indexerName, percentSuccessful));
        }
        result.sort(Comparator.comparingDouble(SuccessfulDownloadsPerIndexer::getPercentage).reversed());
        logger.debug("Calculated successful download percentages for indexers. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<DownloadOrSearchSharePerUserOrIp> downloadsOrSearchesPerUserOrIp(final StatsRequest statsRequest, String tablename) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        String sql = "" +
                "SELECT\n" +
                "  USERNAME_OR_IP,\n" +
                "  count(*)                                                    AS peruser,\n" +
                "  (SELECT count(*)\n" +
                "   FROM " + tablename + "\n" +
                "   WHERE USERNAME_OR_IP IS NOT NULL AND USERNAME_OR_IP != ''" +
                buildWhereFromStatsRequest(true, statsRequest) +
                ") AS countall\n" +
                "FROM " + tablename + "\n" +
                " WHERE USERNAME_OR_IP IS NOT NULL AND USERNAME_OR_IP != ''\n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "GROUP BY USERNAME_OR_IP";
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        List<DownloadOrSearchSharePerUserOrIp> result = new ArrayList<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String usernameOrIp = (String) o2[0];
            int countForUser = ((BigInteger) o2[1]).intValue();
            float percentSuccessful = 100F / (((BigInteger) o2[2]).floatValue() / ((BigInteger) o2[1]).floatValue());
            result.add(new DownloadOrSearchSharePerUserOrIp(usernameOrIp, countForUser, percentSuccessful));
        }
        result.sort(Comparator.comparingDouble(DownloadOrSearchSharePerUserOrIp::getPercentage).reversed());
        logger.debug("Calculated downloadsOrSearches for table {}. Took {}ms", tablename, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<DownloadPerAge> downloadsPerAge() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        List<DownloadPerAge> results = new ArrayList<>();
        for (int i = 1; i <= 35; i++) {
            String sql = String.format("SELECT COUNT(*)\n" +
                    "FROM INDEXERNZBDOWNLOAD\n" +
                    "WHERE AGE >= %d AND AGE < %d", (i - 1) * 100, i * 100);
            Query query = entityManager.createNativeQuery(sql);
            int count = ((BigInteger) query.getResultList().get(0)).intValue();
            results.add(new DownloadPerAge((i - 1) * 100, count));
        }

        logger.debug("Calculated downloads per age. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return results;
    }

    DownloadPerAgeStats downloadsPerAgeStats() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        DownloadPerAgeStats result = new DownloadPerAgeStats();
        String percentage = "SELECT CASE\n" +
                "       WHEN (SELECT CAST(COUNT(*) AS FLOAT) AS COUNT\n" +
                "             FROM INDEXERNZBDOWNLOAD\n" +
                "             WHERE AGE > %d) > 0\n" +
                "         THEN SELECT CAST(100 AS FLOAT) / (CAST(COUNT(i.*) AS FLOAT)/ x.COUNT)\n" +
                "FROM INDEXERNZBDOWNLOAD i,\n" +
                "( SELECT COUNT(*) AS COUNT\n" +
                "FROM INDEXERNZBDOWNLOAD\n" +
                "WHERE AGE > %d) AS x\n" +
                "ELSE 0 END";
        result.setPercentOlder1000(((Double) entityManager.createNativeQuery(String.format(percentage, 1000, 1000)).getResultList().get(0)).intValue());
        result.setPercentOlder2000(((Double) entityManager.createNativeQuery(String.format(percentage, 2000, 2000)).getResultList().get(0)).intValue());
        result.setPercentOlder3000(((Double) entityManager.createNativeQuery(String.format(percentage, 3000, 3000)).getResultList().get(0)).intValue());
        result.setAverageAge((Integer) entityManager.createNativeQuery("SELECT AVG(AGE) FROM INDEXERNZBDOWNLOAD").getResultList().get(0));
        logger.debug("Calculated downloads per age percentages . Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }


    private String buildWhereFromStatsRequest(boolean useAnd, StatsRequest statsRequest) {
        return (useAnd ? " AND " : " WHERE ") +
                (statsRequest.getAfter() != null ? " TIME > DATEADD('SECOND', " + statsRequest.getAfter().getEpochSecond() + ", DATE '1970-01-01') " : "") +
                ((statsRequest.getBefore() != null && statsRequest.getAfter() != null) ? " AND " : " ") +
                (statsRequest.getBefore() != null ? " TIME < DATEADD('SECOND', " + statsRequest.getBefore().getEpochSecond() + ", DATE '1970-01-01') " : "");
    }


}
