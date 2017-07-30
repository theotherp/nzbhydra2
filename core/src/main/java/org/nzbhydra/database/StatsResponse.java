package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.web.mapping.stats.AverageResponseTime;
import org.nzbhydra.web.mapping.stats.CountPerDayOfWeek;
import org.nzbhydra.web.mapping.stats.CountPerHourOfDay;
import org.nzbhydra.web.mapping.stats.DownloadPerAge;
import org.nzbhydra.web.mapping.stats.DownloadPerAgeStats;
import org.nzbhydra.web.mapping.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.web.mapping.stats.IndexerDownloadShare;
import org.nzbhydra.web.mapping.stats.IndexerSearchResultsShare;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
public class StatsResponse {

    private Instant after = null;
    private Instant before = null;

    private List<IndexerApiAccessStatsEntry> indexerApiAccessStats;

    private List<IndexerSearchResultsShare> avgIndexerSearchResultsShares = new ArrayList<>();

    private List<AverageResponseTime> avgResponseTimes = new ArrayList<>();

    private List<IndexerDownloadShare> indexerDownloadShares = new ArrayList<>();

    private List<CountPerDayOfWeek> downloadsPerDayOfWeek = new ArrayList<>();
    private List<CountPerHourOfDay> downloadsPerHourOfDay = new ArrayList<>();

    private List<CountPerDayOfWeek> searchesPerDayOfWeek = new ArrayList<>();
    private List<CountPerHourOfDay> searchesPerHourOfDay = new ArrayList<>();

    private List<DownloadPerAge> downloadsPerAge = new ArrayList<>();
    private DownloadPerAgeStats downloadsPerAgeStats = new DownloadPerAgeStats();

}
