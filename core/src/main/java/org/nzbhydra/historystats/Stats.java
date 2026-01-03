package org.nzbhydra.historystats;

import com.google.common.base.Stopwatch;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.historystats.stats.AverageResponseTime;
import org.nzbhydra.historystats.stats.CountPerDayOfWeek;
import org.nzbhydra.historystats.stats.CountPerHourOfDay;
import org.nzbhydra.historystats.stats.DownloadOrSearchSharePerUserOrIp;
import org.nzbhydra.historystats.stats.DownloadPerAge;
import org.nzbhydra.historystats.stats.DownloadPerAgeStats;
import org.nzbhydra.historystats.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.historystats.stats.IndexerDownloadShare;
import org.nzbhydra.historystats.stats.IndexerScore;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.historystats.stats.SuccessfulDownloadsPerIndexer;
import org.nzbhydra.historystats.stats.UserAgentShare;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerAccessResult;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
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

@SuppressWarnings("OptionalGetWithoutIsPresent")
@RestController
public class Stats {

    private static final Logger logger = LoggerFactory.getLogger(Stats.class);
    private static final int TIMEOUT = 120;

    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerUniquenessScoreEntityRepository uniquenessScoreEntityRepository;

    @Transactional(readOnly = true)
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
        if (statsRequest.isAvgIndexerUniquenessScore()) {
            futures.add(executor.submit(() -> statsResponse.setIndexerScores(indexerScores(statsRequest))));
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

        if (statsRequest.isUserAgentSearchShares()) {
            futures.add(executor.submit(() -> statsResponse.setUserAgentSearchShares(userAgentSearchShares(statsRequest))));
        }

        if (statsRequest.isUserAgentDownloadShares()) {
            futures.add(executor.submit(() -> statsResponse.setUserAgentDownloadShares(userAgentDownloadShares(statsRequest))));
        }


        if (statsRequest.isSearchSharesPerUser()) {
            Long countSearchesWithData = (Long) entityManager.createNativeQuery("SELECT count(*) FROM SEARCH t WHERE t.USERNAME IS NOT NULL").getSingleResult();
            if (countSearchesWithData.intValue() > 0) {
                futures.add(executor.submit(() -> statsResponse.setSearchSharesPerUser(downloadsOrSearchesPerUserOrIp(statsRequest, "SEARCH", "USERNAME"))));
            }
        }
        if (statsRequest.isDownloadSharesPerUser()) {
            Long countDownloadsWithData = (Long) entityManager.createNativeQuery("SELECT count(*) FROM INDEXERNZBDOWNLOAD t WHERE t.USERNAME IS NOT NULL").getSingleResult();
            if (countDownloadsWithData > 0) {
                futures.add(executor.submit(() -> statsResponse.setDownloadSharesPerUser(downloadsOrSearchesPerUserOrIp(statsRequest, "INDEXERNZBDOWNLOAD", "USERNAME"))));
            }
        }
        if (statsRequest.isSearchSharesPerIp()) {
            Long countSearchesWithData = (Long) entityManager.createNativeQuery("SELECT count(*) FROM SEARCH t WHERE t.IP IS NOT NULL").getSingleResult();
            if (countSearchesWithData > 0) {
                futures.add(executor.submit(() -> statsResponse.setSearchSharesPerIp(downloadsOrSearchesPerUserOrIp(statsRequest, "SEARCH", "IP"))));
            }
        }
        if (statsRequest.isDownloadSharesPerIp()) {
            Long countDownloadsWithData = (Long) entityManager.createNativeQuery("SELECT count(*) FROM INDEXERNZBDOWNLOAD t WHERE t.IP IS NOT NULL").getSingleResult();
            if (countDownloadsWithData > 0) {
                futures.add(executor.submit(() -> statsResponse.setDownloadSharesPerIp(downloadsOrSearchesPerUserOrIp(statsRequest, "INDEXERNZBDOWNLOAD", "IP"))));
            }
        }


        executor.shutdown();
        boolean wasCompleted = executor.awaitTermination(TIMEOUT, TimeUnit.SECONDS);
        if (!wasCompleted) {
            executor.shutdownNow();
            logger.error("Aborted stats generation because it took longer than {} seconds. Please restart", TIMEOUT);
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

        String sqlQueryByIndexer =
            "SELECT\n" +
                "  indexer.name,\n" +
                "  count(*) AS total,\n" +
                "  countall.countall\n" +
                "FROM\n" +
                "  indexernzbdownload dl LEFT JOIN SEARCHRESULT ON dl.SEARCH_RESULT_ID = SEARCHRESULT.ID\n" +
                "  LEFT JOIN indexer ON SEARCHRESULT.INDEXER_ID = INDEXER.ID\n" +
                "  ,\n" +
                "  (SELECT count(*) AS countall\n" +
                "   FROM\n" +
                "     indexernzbdownload dl LEFT JOIN SEARCHRESULT ON dl.SEARCH_RESULT_ID = SEARCHRESULT.ID\n" +
                buildWhereFromStatsRequest(false, statsRequest) +
                ")\n" +
                "  countall\n" +
                buildWhereFromStatsRequest(false, statsRequest) +
                "GROUP BY\n" +
                "  INDEXER.NAME";

        Query query = entityManager.createNativeQuery(sqlQueryByIndexer);
        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().getState() == IndexerConfig.State.ENABLED || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        List resultList = query.getResultList();
        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];
            if (!indexerNamesToInclude.contains(indexerName)) {
                continue;
            }
            long total = ((Long) resultSet[1]).longValue();
            long countAll = ((Long) resultSet[2]).longValue();
            float share = total > 0 ? (100F / ((float) countAll / total)) : 0F;
            indexerDownloadShares.add(new IndexerDownloadShare(indexerName, total, share));
        }
        indexerDownloadShares.sort((IndexerDownloadShare a, IndexerDownloadShare b) -> Float.compare(b.getShare(), a.getShare()));
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

        Query query = entityManager.createNativeQuery(sql);
        List resultList = query.getResultList();
        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().getState() == IndexerConfig.State.ENABLED || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        OptionalDouble overallAverage = resultList.stream().filter(x -> ((Object[]) x)[1] != null).mapToLong(x -> ((BigDecimal) ((Object[]) x)[1]).longValue()).average();

        for (Object result : resultList) {
            Object[] resultSet = (Object[]) result;
            String indexerName = (String) resultSet[0];

            if (resultSet[0] == null || resultSet[1] == null || !indexerNamesToInclude.contains(indexerName)) {
                continue;
            }
            long averageResponseTime = ((BigDecimal) resultSet[1]).longValue();
            averageResponseTimes.add(new AverageResponseTime(indexerName, averageResponseTime, averageResponseTime - overallAverage.orElse(0D)));
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated average response times for indexers. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return averageResponseTimes;
    }

    /**
     * Calculates how unique a downloaded result was, i.e. how many other indexers could've (or not could've) provided the same result.
     */
    @Transactional(readOnly = true)
    public List<IndexerScore> indexerScores(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating indexer result uniqueness scores");

        List<SearchModuleType> typesToUse = Arrays.asList(SearchModuleType.NEWZNAB, SearchModuleType.TORZNAB, SearchModuleType.ANIZB);
        final Set<String> indexersToInclude = (statsRequest.isIncludeDisabled() ? searchModuleProvider.getIndexers() : searchModuleProvider.getEnabledIndexers().stream().filter(x -> typesToUse.contains(x.getConfig().getSearchModuleType())).toList()).stream().map(Indexer::getName).collect(Collectors.toSet());

        List<IndexerScore> indexerUniquenessScores = calculateIndexerScores(indexersToInclude, uniquenessScoreEntityRepository.findAll());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated indexer result uniqueness scores. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return indexerUniquenessScores;
    }

    List<IndexerScore> calculateIndexerScores(Set<String> indexersToInclude, List<IndexerUniquenessScoreEntity> scoreEntities) {
        List<IndexerScore> scores = new ArrayList<>();
        // Group all entities by indexer, not filtering by hasResult yet
        Map<IndexerEntity, List<IndexerUniquenessScoreEntity>> entities = scoreEntities.stream()
            .filter(x -> indexersToInclude.contains(x.getIndexer().getName()))
            .collect(Collectors.groupingBy(IndexerUniquenessScoreEntity::getIndexer));
        for (Entry<IndexerEntity, List<IndexerUniquenessScoreEntity>> indexerEntityListEntry : entities.entrySet()) {
            List<IndexerUniquenessScoreEntity> allEntries = indexerEntityListEntry.getValue();
            // Filter to only entries with results for score calculation
            List<IndexerUniquenessScoreEntity> entriesWithResult = allEntries.stream()
                    .filter(IndexerUniquenessScoreEntity::isHasResult)
                    .toList();

            Integer averageScore;
            if (!entriesWithResult.isEmpty()) {
                OptionalDouble average = entriesWithResult.stream().mapToDouble(x -> (100D * (double) x.getInvolved() / (double) x.getHave())).average();
                averageScore = (int) average.getAsDouble();
            } else {
                averageScore = null;
            }
            IndexerScore indexerScore = new IndexerScore();
            indexerScore.setIndexerName(indexerEntityListEntry.getKey().getName());
            indexerScore.setAverageUniquenessScore(averageScore);
            // Count all searches where this indexer was involved, not just those with results
            indexerScore.setInvolvedSearches(allEntries.size());
            // Unique downloads only counted from entries with results
            long uniqueDownloads = entriesWithResult.stream().filter(x -> x.getHave() == 1 && x.getInvolved() > 1).count();
            indexerScore.setUniqueDownloads(uniqueDownloads);
            scores.add(indexerScore);
        }
        scores.sort(Comparator.comparing(IndexerScore::getAverageUniquenessScore, Comparator.nullsLast(Comparator.reverseOrder())));
        return scores;
    }


    List<IndexerApiAccessStatsEntry> indexerApiAccesses(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating indexer API stats");
        Set<Integer> indexerIdsToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().getState() == IndexerConfig.State.ENABLED || statsRequest.isIncludeDisabled()).map(x -> x.getIndexerEntity().getId()).filter(id -> indexerRepository.findById(id) != null).collect(Collectors.toSet());

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
            Double avg = ((BigDecimal) array[1]).doubleValue();
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
            int count = ((Long) array[2]).intValue();
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
            IndexerEntity indexerEntity = indexerRepository.findById(id).get();
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
            Long counter = (Long) resultSet[1];
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
            Long counter = (Long) o2[1];
            hourOfDayCounts.get(index).setCount(counter.intValue());
        }

        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated count for hour of day for table {}. Took {}ms", table, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return hourOfDayCounts;
    }

    List<SuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        String sql = "SELECT\n" +
            "  name1,\n" +
            "  count_all,\n" +
            "  count_success,\n" +
            "  count_error\n" +
            "FROM\n" +
            "  (SELECT\n" +
            "     indexer.NAME AS name1,\n" +
            "     count(*)   AS count_success\n" +
            "   FROM INDEXERNZBDOWNLOAD\n" +
            "     LEFT JOIN SEARCHRESULT ON INDEXERNZBDOWNLOAD.SEARCH_RESULT_ID = SEARCHRESULT.ID\n" +
            "     LEFT JOIN indexer ON SEARCHRESULT.INDEXER_ID = INDEXER.ID\n" +
            "   WHERE\n" +
            "     status = 'CONTENT_DOWNLOAD_SUCCESSFUL'\n" +
            buildWhereFromStatsRequest(true, statsRequest) +
            "   GROUP BY name1)\n" +
            "  LEFT JOIN\n" +
            "  (SELECT\n" +
            "     indexer.NAME AS name2,\n" +
            "     count(*)   AS count_error\n" +
            "   FROM INDEXERNZBDOWNLOAD\n" +
            "     LEFT JOIN SEARCHRESULT ON INDEXERNZBDOWNLOAD.SEARCH_RESULT_ID = SEARCHRESULT.ID\n" +
            "     LEFT JOIN indexer ON SEARCHRESULT.INDEXER_ID = INDEXER.ID\n" +
            "   WHERE\n" +
            "     status IN ('CONTENT_DOWNLOAD_ERROR', 'CONTENT_DOWNLOAD_WARNING')\n" +
            buildWhereFromStatsRequest(true, statsRequest) +
            "   GROUP BY name2) ON name1 = name2\n" +
            "  LEFT JOIN\n" +
            "  (SELECT\n" +
            "     indexer.NAME AS name3,\n" +
            "     count(*)   AS count_all\n" +
            "   FROM INDEXERNZBDOWNLOAD\n" +
            "     LEFT JOIN SEARCHRESULT ON INDEXERNZBDOWNLOAD.SEARCH_RESULT_ID = SEARCHRESULT.ID\n" +
            "     LEFT JOIN indexer ON SEARCHRESULT.INDEXER_ID = INDEXER.ID\n" +
            buildWhereFromStatsRequest(false, statsRequest) +
            "   GROUP BY name3) ON name1 = name3;";
        Query query = entityManager.createNativeQuery(sql);
        Set<String> indexerNamesToInclude = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().getState() == IndexerConfig.State.ENABLED || statsRequest.isIncludeDisabled()).map(Indexer::getName).collect(Collectors.toSet());
        List<Object> resultList = query.getResultList();
        List<SuccessfulDownloadsPerIndexer> result = new ArrayList<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String indexerName = (String) o2[0];
            if (!indexerNamesToInclude.contains(indexerName)) {
                continue;
            }
            Long countAll = (Long) o2[1];
            Long countSuccess = (Long) o2[2];
            Long countError = (Long) o2[3];
            if (countAll == null) {
                countAll = 0L;
            }
            if (countSuccess == null) {
                countSuccess = 0L;
            }
            if (countError == null) {
                countError = 0L;
            }

            Float percentSuccessful;
            if (countSuccess.intValue() > 0) {
                percentSuccessful = 100F / ((countSuccess.floatValue() + countError.floatValue()) / countSuccess.floatValue());
            } else if (countAll.intValue() > 0) {
                percentSuccessful = 0F;
            } else {
                percentSuccessful = null;
            }
            result.add(new SuccessfulDownloadsPerIndexer(indexerName, countAll.intValue(), countSuccess.intValue(), countError.intValue(), percentSuccessful));
        }
        result.sort(Comparator.comparingDouble(SuccessfulDownloadsPerIndexer::getPercentSuccessful).reversed());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated successful download percentages for indexers. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<DownloadOrSearchSharePerUserOrIp> downloadsOrSearchesPerUserOrIp(final StatsRequest statsRequest, String tablename, final String column) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating download or search shares for table {} and column {}", tablename, column);
        String sql = "" +
            "SELECT\n" +
            "  " + column + ",\n" +
            "  count(*) AS peruser,\n" +
            "  (SELECT count(*)\n" +
            "   FROM " + tablename + "\n" +
            "   WHERE " + column + " IS NOT NULL AND " + column + " != ''" +
            buildWhereFromStatsRequest(true, statsRequest) +
            ") AS countall\n" +
            "FROM " + tablename + "\n" +
            " WHERE " + column + " IS NOT NULL AND " + column + " != ''\n" +
            buildWhereFromStatsRequest(true, statsRequest) +
            "GROUP BY " + column;
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        List<DownloadOrSearchSharePerUserOrIp> result = new ArrayList<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String usernameOrIp = (String) o2[0];
            int countForUser = ((Long) o2[1]).intValue();
            float percentSuccessful = 100F / (((Long) o2[2]).floatValue() / ((Long) o2[1]).floatValue());
            result.add(new DownloadOrSearchSharePerUserOrIp(usernameOrIp, countForUser, percentSuccessful));
        }
        result.sort(Comparator.comparingDouble(DownloadOrSearchSharePerUserOrIp::getPercentage).reversed());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated download or search shares for table {} and column {}. Took {}ms", tablename, column, stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<UserAgentShare> userAgentSearchShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating user agent search shares");
        String sql = "SELECT\n" +
            "  user_agent,\n" +
            "  count(*)\n" +
            "FROM SEARCH\n" +
            "WHERE user_agent IS NOT NULL\n" +
            "AND SOURCE = 'API'" +
            buildWhereFromStatsRequest(true, statsRequest) +
            "GROUP BY user_agent";
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        List<UserAgentShare> result = new ArrayList<>();
        int countAll = 0;
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String userAgent = (String) o2[0];
            int countForUserAgent = ((Long) o2[1]).intValue();
            countAll += countForUserAgent;
            result.add(new UserAgentShare(userAgent, countForUserAgent));
        }
        for (UserAgentShare userAgentShare : result) {
            userAgentShare.setPercentage(100F / ((float) countAll / userAgentShare.getCount()));
        }

        result.sort(Comparator.comparingDouble(UserAgentShare::getPercentage).reversed());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated user agent search shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<UserAgentShare> userAgentDownloadShares(final StatsRequest statsRequest) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating user agent download shares");
        String sql = "SELECT\n" +
            "  user_agent,\n" +
            "  count(*)\n" +
            "FROM INDEXERNZBDOWNLOAD\n" +
            "WHERE user_agent IS NOT NULL\n" +
            "and ACCESS_SOURCE = 'API' \n" +
            buildWhereFromStatsRequest(true, statsRequest) +
            "GROUP BY user_agent";
        Query query = entityManager.createNativeQuery(sql);
        List<Object> resultList = query.getResultList();
        List<UserAgentShare> result = new ArrayList<>();
        int countAll = 0;
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            String userAgent = (String) o2[0];
            int countForUserAgent = ((Long) o2[1]).intValue();
            countAll += countForUserAgent;
            result.add(new UserAgentShare(userAgent, countForUserAgent));
        }
        for (UserAgentShare userAgentShare : result) {
            userAgentShare.setPercentage(100F / ((float) countAll / userAgentShare.getCount()));
        }

        result.sort(Comparator.comparingDouble(UserAgentShare::getPercentage).reversed());
        logger.debug(LoggingMarkers.PERFORMANCE, "Calculated user agent download shares. Took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return result;
    }

    List<DownloadPerAge> downloadsPerAge() {
        Stopwatch stopwatch = Stopwatch.createStarted();
        logger.debug("Calculating downloads per age");
        String sql = """
            SELECT
              steps,
              count(*)
            FROM
              (SELECT age / 100 AS steps
               FROM INDEXERNZBDOWNLOAD
               WHERE age IS NOT NULL)
            GROUP BY steps
            ORDER BY steps ASC""";
        Query query = entityManager.createNativeQuery(sql);
        List resultList = query.getResultList();
        List<DownloadPerAge> results = new ArrayList<>();
        Map<Integer, Integer> agesAndCountsMap = new HashMap<>();
        for (Object o : resultList) {
            Object[] o2 = (Object[]) o;
            int ageStep = (Integer) o2[0];
            int count = ((Long) o2[1]).intValue();
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
        String percentage = """
            SELECT CASE
                   WHEN (SELECT CAST(COUNT(*) AS FLOAT) AS COUNT
                         FROM INDEXERNZBDOWNLOAD
                         WHERE AGE > %d) > 0
                     THEN SELECT CAST(100 AS FLOAT) / (CAST(COUNT(i.*) AS FLOAT)/ x.COUNT)
            FROM INDEXERNZBDOWNLOAD i,
            ( SELECT COUNT(*) AS COUNT
            FROM INDEXERNZBDOWNLOAD
            WHERE AGE > %d) AS x
            ELSE 0 END""";
        result.setPercentOlder1000(((BigDecimal) entityManager.createNativeQuery(String.format(percentage, 1000, 1000)).getResultList().get(0)).intValue());
        result.setPercentOlder2000(((BigDecimal) entityManager.createNativeQuery(String.format(percentage, 2000, 2000)).getResultList().get(0)).intValue());
        result.setPercentOlder3000(((BigDecimal) entityManager.createNativeQuery(String.format(percentage, 3000, 3000)).getResultList().get(0)).intValue());
        final Double averageAge = (Double) entityManager.createNativeQuery("SELECT AVG(AGE) FROM INDEXERNZBDOWNLOAD").getResultList().get(0);
        result.setAverageAge(averageAge == null ? 0 : averageAge.intValue());
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
