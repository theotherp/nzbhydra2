package org.nzbhydra.historystats;

import com.google.common.base.Stopwatch;
import org.nzbhydra.config.SearchModuleType;
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
import org.nzbhydra.historystats.stats.UserAgentShare;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerAccessResult;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.SearchModuleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
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
import java.util.Map.Entry;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
public class Stats {

    private static final Logger logger = LoggerFactory.getLogger(Stats.class);

    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public StatsResponse getAllStats(StatsRequest statsRequest) throws InterruptedException {
        logger.debug("Request for stats between {} and {}", statsRequest.getAfter(), statsRequest.getBefore());
        Stopwatch stopwatch = Stopwatch.createStarted();

        StatsResponse statsResponse = new StatsResponse();
        statsResponse.setAfter(statsRequest.getAfter());
        statsResponse.setBefore(statsRequest.getBefore());

        ExecutorService executor = Executors.newFixedThreadPool(1); //Multithreading doesn't improve performance but it allows us to stop calculation when the time is over

        List<Future> futures = new ArrayList<>();

        if (statsRequest.isAvgResponseTimes()) {
            futures.add(executor.submit(() -> statsResponse.setAvgResponseTimes(averageResponseTimes(statsRequest))));
        }
        if (statsRequest.isIndexerApiAccessStats()) {
            futures.add(executor.submit(() -> statsResponse.setIndexerApiAccessStats(indexerApiAccesses(statsRequest))));
        }
        if (statsRequest.isAvgIndexerSearchResultsShares()) {
            futures.add(executor.submit(() -> statsResponse.setAvgIndexerSearchResultsShares(indexerSearchShares(statsRequest))));
        }

        if (statsRequest.isSearchesPerDayOfWeek()) {
            futures.add(executor.submit(() -> statsResponse.setSearchesPerDayOfWeek(countPerDayOfWeek("SEARCH", statsRequest))));
        }
        if (statsRequest.isDownloadsPerDayOfWeek()) {
            futures.add(executor.submit(() -> statsResponse.setDownloadsPerDayOfWeek(countPerDayOfWeek("INDEXERNZBDOWNLOAD", statsRequest))));
        }

        if (statsRequest.isSearchesPerHourOfDay()) {
            futures.add(executor.submit(() -> statsResponse.setSearchesPerHourOfDay(countPerHourOfDay("SEARCH", statsRequest)))); 
        }
        if (statsRequest.isDownloadsPerHourOfDay()) {
            futures.add(executor.submit(() -> statsResponse.setDownloadsPerHourOfDay(countPerHourOfDay("INDEXERNZBDOWNLOAD", statsRequest)))); 
        }

        if (statsRequest.isIndexerDownloadShares()) {
            futures.add(executor.submit(() -> statsResponse.setIndexerDownloadShares(indexerDownloadShares(statsRequest))));
        }


        if (statsRequest.isDownloadsPerAgeStats()) {
            futures.add(executor.submit(() -> statsResponse.setDownloadsPerAgeStats(downloadsPerAgeStats())));
        }

        if (statsRequest.isSuccessfulDownloadsPerIndexer()) {
            futures.add(executor.submit(() -> statsResponse.setSuccessfulDownloadsPerIndexer(successfulDownloadsPerIndexer(statsRequest))));
        }

        if (statsRequest.isUserAgentShares()) {
            futures.add(executor.submit(() -> statsResponse.setUserAgentShares(userAgentShares(statsRequest))));
        }


        if (statsRequest.isDownloadSharesPerUserOrIp()) {
            BigInteger countDownloadsWithData = (BigInteger) entityManager.createNativeQuery("SELECT count(*) FROM INDEXERNZBDOWNLOAD t WHERE t.USERNAME_OR_IP IS NOT NULL").getSingleResult();
            if (countDownloadsWithData.intValue() > 0) {
                futures.add(executor.submit(() -> statsResponse.setDownloadSharesPerUserOrIp(downloadsOrSearchesPerUserOrIp(statsRequest, "INDEXERNZBDOWNLOAD"))));
            }
        }
        if (statsRequest.isSearchSharesPerUserOrIp()) {
            BigInteger countSearchesWithData = (BigInteger) entityManager.createNativeQuery("SELECT count(*) FROM SEARCH t WHERE t.USERNAME_OR_IP IS NOT NULL").getSingleResult();
            if (countSearchesWithData.intValue() > 0) {
                futures.add(executor.submit(() -> statsResponse.setSearchSharesPerUserOrIp(downloadsOrSearchesPerUserOrIp(statsRequest, "SEARCH"))));
            }
        }


        executor.shutdown();
        boolean wasCompleted = executor.awaitTermination(60, TimeUnit.SECONDS);
        if (!wasCompleted) {
            executor.shutdownNow();
            logger.error("Aborted stats generation because it took longer than 60 seconds");
        } else {
            for (Future future : futures) {
                try {
                    future.get();
                } catch (ExecutionException e) {
                    logger.error("Error during calculation of stats", e.getCause());
                }
            }

        }

        statsResponse.setNumberOfConfiguredIndexers(searchModuleProvider.getIndexers().size());
        statsResponse.setNumberOfEnabledIndexers(searchModuleProvider.getEnabledIndexers().size());

        logger.info("Stats calculation took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return statsResponse;
    }

    List<IndexerDownloadShare> indexerDownloadShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating indexer download shares");
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
                        buildWhereFromStatsRequest(false, statsRequest) +
                        ")\n" +
                        "  countall\n" +
                        "  , INDEXER\n" +
                        buildWhereFromStatsRequest(false, statsRequest) +
                        "      AND dl.INDEXER_ID = indexer.ID\n" +
                        "GROUP BY\n" +
                        "  dl.INDEXER_ID";

        Query query = entityManager.createNativeQuery(sql);
        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        List resultList = query.getResultList();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            if (!indexerNamesToInclude.contains(indexerName)) {
                continue;
            }
            long total = ((BigInteger) resultSet[1]).longValue();
            long countAll = ((BigInteger) resultSet[2]).longValue();
            float share = total > 0 ? (100F / ((float) countAll / total)) : 0F;
            indexerDownloadShares.add(new IndexerDownloadShare(indexerName, total, share));
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated indexer download shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerDownloadShares;
    }

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

        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        Query query = entityManager.createNativeQuery(sql);
        List resultList = query.getResultList();
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
    @Transactional
    List<IndexerSearchResultsShare> indexerSearchShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating indexer search shares");
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
                "                WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId \n" +
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
                "      sum(INDEXERSEARCH.RESULTS_COUNT)  AS ALLRESULTSSUM,\n" +
                "      SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS ALLUNIQUERESULTSSUM\n" +
                "    FROM INDEXERSEARCH\n" +
                "    WHERE INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                             FROM indexersearch\n" +
                "                                               LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID\n" +
                "                                               LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                             WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId \n" +
                "                                                   AND INDEXERSEARCH.successful AND\n" +
                "                                                   INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID\n" +
                "                                                                                      FROM SEARCH\n" +
                "                                                                                        LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID\n" +
                "                                                                                      WHERE\n" +
                "                                                                                        (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR\n" +
                "                                                                                         SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL OR SEARCH.AUTHOR IS NOT NULL OR SEARCH.TITLE IS NOT NULL)\n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "                                                   )\n" +
                "                                                   AND INDEXERSEARCH.successful)" +
                "         AND INDEXERSEARCH.successful\n" +
                "  ) FORALL";


        List<Indexer> indexersToInclude = statsRequest.isIncludeDisabled() ? searchModuleProvider.getIndexers() : searchModuleProvider.getEnabledIndexers();
        List<SearchModuleType> typesToUse = Arrays.asList(SearchModuleType.NEWZNAB, SearchModuleType.TORZNAB, SearchModuleType.ANIZB);
        indexersToInclude = indexersToInclude.stream().filter(x -> typesToUse.contains(x.getConfig().getSearchModuleType())).collect(Collectors.toList());
        for (Indexer indexer : indexersToInclude) {
            logger.debug("Calculating search shares for indexer {}", indexer.getName());
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
                if (allUniqueResultsSum.intValue() > 0) {
                    uniqueShare = 100 / (allUniqueResultsSum.floatValue() / indexerUniqueResultsSum.floatValue());
                }
            }
            indexerSearchResultsShares.add(new IndexerSearchResultsShare(indexer.getName(), allShare, uniqueShare));
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated indexer search shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerSearchResultsShares;
    }


    List<IndexerApiAccessStatsEntry> indexerApiAccesses(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating indexer API stats");
        Set<Integer> indexerIdsToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(x -> x.getIndexerEntity().getId()).filter(id -> indexerRepository.findOne(id) != null).collect(Collectors.toSet());

        String averageIndexerAccessesPerDay = "SELECT\n" +
                "  indexer_id,\n" +
                "  avg(count)\n" +
                "FROM (\n" +
                "  (SELECT\n" +
                "     INDEXER_ID,\n" +
                "     cast(count(INDEXER_ID) AS FLOAT) AS count" +
                "   FROM INDEXERAPIACCESS\n" +
                buildWhereFromStatsRequest(false, statsRequest) +
                "   GROUP BY INDEXER_ID,\n" +
                "     truncate(time)))\n" +
                "GROUP BY INDEXER_ID";

        Map<Integer, Double> accessesPerDayCountMap = new HashMap<>();
        Query query = entityManager.createNativeQuery(averageIndexerAccessesPerDay);
        //query = query.setParameter("indexerIds", indexerIdsToInclude);
        List results = query.getResultList();
        for (Object resultObject : results) {
            Object[] array = (Object[]) resultObject;
            Integer indexerId = (Integer) array[0];
            if (!indexerIdsToInclude.contains(indexerId)) {
                continue;
            }
            Double avg = (Double) array[1];
            accessesPerDayCountMap.put(indexerId, avg);
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculating accesses per day took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        stopwatch.reset();
        stopwatch.start();

        String countByResultSql = "SELECT\n" +
                "     INDEXER_ID,\n" +
                "     RESULT,\n" +
                "     count(result) AS count\n" +
                "   FROM INDEXERAPIACCESS\n" +
                buildWhereFromStatsRequest(false, statsRequest) +
                "   GROUP BY INDEXER_ID, RESULT\n" +
                "   ORDER BY INDEXER_ID, RESULT";

        Map<Integer, Integer> successCountMap = new HashMap<>();
        Map<Integer, Integer> connectionErrorCountMap = new HashMap<>();
        Map<Integer, Integer> allAccessesCountMap = new HashMap<>();
        query = entityManager.createNativeQuery(countByResultSql);
        //query = query.setParameter("indexerIds", indexerIdsToInclude);
        results = query.getResultList();
        for (Object resultObject : results) {
            Object[] array = (Object[]) resultObject;
            Integer indexerId = (Integer) array[0];
            if (!indexerIdsToInclude.contains(indexerId)) {
                continue;
            }
            String result = (String) array[1];
            int count = ((BigInteger) array[2]).intValue();
            if (result.equals(IndexerAccessResult.SUCCESSFUL.name())) {
                successCountMap.put(indexerId, count);
            } else if (result.equals(IndexerAccessResult.CONNECTION_ERROR.name())) {
                connectionErrorCountMap.put(indexerId, count);
            }
            if (allAccessesCountMap.containsKey(indexerId)) {
                allAccessesCountMap.put(indexerId, allAccessesCountMap.get(indexerId) + count);
            } else {
                allAccessesCountMap.put(indexerId, count);
            }
        }

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
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculating success/failure stats took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerApiAccessStatsEntries;
    }

    List<CountPerDayOfWeek> countPerDayOfWeek(final String table, final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating count for day of week for table {}", table);
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
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated count for day of week for table {}. Took {}ms", table, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return dayOfWeekCounts;
    }


    List<CountPerHourOfDay> countPerHourOfDay(final String table, final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating count for hour of day for table {}", table);
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

        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated count for hour of day for table {}. Took {}ms", table, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return hourOfDayCounts;
    }

    List<SuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        String sql = "SELECT  INDEXER.name, 100/((CAST((count_error+ count_success) as float))/count_success) as percent\n" +
                "from\n" +
                "  (select indexer_id as id_1, count(*)as count_error from INDEXERNZBDOWNLOAD  WHERE " +
                //"INDEXER_ID IN (:indexerIds) AND " +
                "status in ('CONTENT_DOWNLOAD_ERROR', 'CONTENT_DOWNLOAD_WARNING') " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "GROUP BY INDEXER_ID),\n" +
                "  (select indexer_id as id_2, count(*)as count_success from INDEXERNZBDOWNLOAD WHERE " +
                //"INDEXER_ID IN (:indexerIds) AND  " +
                "status ='CONTENT_DOWNLOAD_SUCCESSFUL' " +
                buildWhereFromStatsRequest(true, statsRequest) +
                "GROUP BY INDEXER_ID) " +
                ",INDEXER where id_1 = id_2 and id_1 = INDEXER.ID";
        Query query = entityManager.createNativeQuery(sql);
        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled() || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        //query.setParameter("indexerIds", indexerIdsToInclude);
        List<Object> resultList = query.getResultList();
        List<SuccessfulDownloadsPerIndexer> result = new ArrayList<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String indexerName = (String) o2[0];
            if (!indexerNamesToInclude.contains(indexerName)) {
                continue;
            }
            Double percentSuccessful = (Double) o2[1];
            result.add(new SuccessfulDownloadsPerIndexer(indexerName, percentSuccessful));
        }
        result.sort(Comparator.comparingDouble(SuccessfulDownloadsPerIndexer::getPercentage).reversed());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated successful download percentages for indexers. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<DownloadOrSearchSharePerUserOrIp> downloadsOrSearchesPerUserOrIp(final StatsRequest statsRequest, String tablename) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating download or search shares for table {}", tablename);
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
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated download or search shares for table {}. Took {}ms", tablename, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<UserAgentShare> userAgentShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating user agent shares");
        String sql = "SELECT\n" +
                "  user_agent,\n" +
                "  count(*)\n" +
                "FROM SEARCH\n" +
                "WHERE user_agent IS NOT NULL\n" +
                buildWhereFromStatsRequest(true, statsRequest) +
                "GROUP BY user_agent";
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        List<UserAgentShare> result = new ArrayList<>();
        int countAll = 0;
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String userAgent = (String) o2[0];
            int countForUserAgent = ((BigInteger) o2[1]).intValue();
            countAll += countForUserAgent;
            result.add(new UserAgentShare(userAgent, countForUserAgent));
        }
        for (UserAgentShare userAgentShare : result) {
            userAgentShare.setPercentage(100F / ((float) countAll / userAgentShare.getCount()));
        }

        result.sort(Comparator.comparingDouble(UserAgentShare::getPercentage).reversed());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated user agent shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<DownloadPerAge> downloadsPerAge() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating downloads per age");
        String sql = "SELECT\n" +
                "  steps,\n" +
                "  count(*)\n" +
                "FROM\n" +
                "  (SELECT age / 100 AS steps\n" +
                "   FROM INDEXERNZBDOWNLOAD\n" +
                "   WHERE age IS NOT NULL)\n" +
                "GROUP BY steps\n" +
                "ORDER BY steps ASC";
        Query query = entityManager.createNativeQuery(sql);
        List resultList = query.getResultList();
        List<DownloadPerAge> results = new ArrayList<>();
        Map<Integer, Integer> agesAndCountsMap = new HashMap<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            int ageStep = (Integer) o2[0];
            int count = ((BigInteger) o2[1]).intValue();
            agesAndCountsMap.put(ageStep, count);
        }
        for (int i = 0; i <= 34; i += 1) {
            if (!agesAndCountsMap.containsKey(i)) {
                agesAndCountsMap.put(i, 0);
            }
        }
        for (Entry<Integer, Integer> entry : agesAndCountsMap.entrySet()) {
            results.add(new DownloadPerAge(entry.getKey() * 100, entry.getValue()));
        }
        results.sort(Comparator.comparingInt(DownloadPerAge::getAge));

        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated downloads per age. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return results;
    }

    DownloadPerAgeStats downloadsPerAgeStats() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating downloads per age percentages");
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
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated downloads per age percentages . Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));

        result.setDownloadsPerAge(downloadsPerAge());
        return result;
    }


    private String buildWhereFromStatsRequest(boolean useAnd, StatsRequest statsRequest) {
        if (statsRequest.getAfter() == null && statsRequest.getBefore() == null) {
            return " ";
        }
        return (useAnd ? " AND " : " WHERE ") +
                (statsRequest.getAfter() != null ? " TIME > DATEADD('SECOND', " + statsRequest.getAfter().getEpochSecond() + ", DATE '1970-01-01') " : "") +
                ((statsRequest.getBefore() != null && statsRequest.getAfter() != null) ? " AND " : " ") +
                (statsRequest.getBefore() != null ? " TIME < DATEADD('SECOND', " + statsRequest.getBefore().getEpochSecond() + ", DATE '1970-01-01') " : "");
    }


}
