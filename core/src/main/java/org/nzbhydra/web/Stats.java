package org.nzbhydra.web;

import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.web.mapping.AverageResponseTime;
import org.nzbhydra.web.mapping.StatsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

@RestController
public class Stats {

    @Autowired
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @PersistenceContext
    private EntityManager entityManager;

    @RequestMapping(value = "/internalapi/stats/averageResponseTimes")
    public List<AverageResponseTime> averageResponseTimes(@RequestBody StatsRequest statsRequest) {
        List<AverageResponseTime> averageResponseTimes = new ArrayList<>();
        List<Indexer> enabledIndexers = searchModuleProvider.getEnabledIndexers();
        int countIndexersWithAvgResponseTime = 0;
        long sumOfAverageIndexerResponseTimes = 0;
        Map<String, Double> indexersAndTheirAverageResponseTime = new HashMap<>();
        for (Indexer enabledIndexer : enabledIndexers) {
            String sqlQuery = "select avg(RESPONSE_TIME) from INDEXERAPIACCESS t left join INDEXER ON t.INDEXER_ID = INDEXER.ID WHERE INDEXER_ID = " + enabledIndexer.getIndexerEntity().getId();
            Query query = entityManager.createNativeQuery(sqlQuery);
            Number asNumber = (Number) query.getSingleResult();
            if (asNumber != null) {
                Double averageResponseTime = asNumber.doubleValue();
                //OptionalDouble averageResponseTime = enabledIndexer.getIndexerEntity().getApiAccesses().stream().mapToLong(IndexerApiAccessEntity::getResponseTime).average();
                countIndexersWithAvgResponseTime++;
                sumOfAverageIndexerResponseTimes += averageResponseTime;
                indexersAndTheirAverageResponseTime.put(enabledIndexer.getName(), averageResponseTime);
            } else {
                indexersAndTheirAverageResponseTime.put(enabledIndexer.getName(), 0D);
            }
        }
        long overallAverageResponseTime = sumOfAverageIndexerResponseTimes / countIndexersWithAvgResponseTime;
        for (Entry<String, Double> entry : indexersAndTheirAverageResponseTime.entrySet()) {
            if (entry.getValue() > 0) {
                double indexerDelta = entry.getValue() - overallAverageResponseTime;
                averageResponseTimes.add(new AverageResponseTime(entry.getKey(), entry.getValue(), indexerDelta));
            } else {
                averageResponseTimes.add(new AverageResponseTime(entry.getKey(), 0, 0));
            }
        }


        return averageResponseTimes;
    }

    public void searchesPerDayOfWeek() {
        String sql = "select indexer_id, dayname(time), count(time) from INDEXERAPIACCESS group by dayname(time), INDEXER_ID";
    }

    public void apiAccessesPerDayOnAverage() {
        String sql = "select sum(c1)/count(INDEXER_ID) from (\n" +
                "  SELECT\n" +
                "    count(*) AS c1,\n" +
                "    indexer_id,\n" +
                "    DAYOFYEAR(time),\n" +
                "    year(time)\n" +
                "  FROM INDEXERAPIACCESS\n" +
                "  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)\n" +
                ") where INDEXER_ID = 1";
    }


}
