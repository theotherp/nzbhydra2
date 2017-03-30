package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.web.mapping.stats.AverageResponseTime;
import org.nzbhydra.web.mapping.stats.CountPerDayOfWeek;
import org.nzbhydra.web.mapping.stats.CountPerHourOfDay;
import org.nzbhydra.web.mapping.stats.IndexerApiAccessStatsEntry;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
public class StatsResponse {

    private Instant after = null;
    private Instant before = null;

    private List<IndexerApiAccessStatsEntry> indexerApiAccessStats;

    private List<Object> avgIndexerSearchResultsShares = new ArrayList<>();

    private List<AverageResponseTime> avgResponseTimes = new ArrayList<>();

    private List<Object> indexerDownloadShares = new ArrayList<>();

    private List<CountPerDayOfWeek> downloadsPerDayOfWeek = new ArrayList<>();
    private List<CountPerHourOfDay> downloadsPerHourOfDay = new ArrayList<>();

    private List<CountPerDayOfWeek> searchesPerDayOfWeek = new ArrayList<>();
    private List<CountPerHourOfDay> searchesPerHourOfDay = new ArrayList<>();

}
