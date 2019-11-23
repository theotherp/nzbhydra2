package org.nzbhydra.historystats;

import lombok.Data;
import org.nzbhydra.historystats.stats.*;

import java.time.Instant;
import java.util.List;

@Data
public class StatsResponse {

    private Instant after = null;
    private Instant before = null;

    private List<IndexerApiAccessStatsEntry> indexerApiAccessStats;

    private List<IndexerScore> indexerScores;

    private List<AverageResponseTime> avgResponseTimes;

    private List<IndexerDownloadShare> indexerDownloadShares;

    private List<CountPerDayOfWeek> downloadsPerDayOfWeek;
    private List<CountPerHourOfDay> downloadsPerHourOfDay;

    private List<CountPerDayOfWeek> searchesPerDayOfWeek;
    private List<CountPerHourOfDay> searchesPerHourOfDay;

    private DownloadPerAgeStats downloadsPerAgeStats;
    private List<SuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer;
    private List<DownloadOrSearchSharePerUserOrIp> downloadSharesPerUser;
    private List<DownloadOrSearchSharePerUserOrIp> downloadSharesPerIp;
    private List<DownloadOrSearchSharePerUserOrIp> searchSharesPerUser;
    private List<DownloadOrSearchSharePerUserOrIp> searchSharesPerIp;

    private List<UserAgentShare> userAgentSearchShares;
    private List<UserAgentShare> userAgentDownloadShares;

    private int numberOfConfiguredIndexers;
    private int numberOfEnabledIndexers;

}
