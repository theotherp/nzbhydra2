package org.nzbhydra.historystats.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatsRequest {

    private Instant after = Instant.now().minus(30, ChronoUnit.DAYS);
    private Instant before = Instant.now();
    private boolean includeDisabled;

    private boolean indexerApiAccessStats;
    private boolean avgIndexerSearchResultsShares;
    private boolean avgResponseTimes;
    private boolean indexerDownloadShares;
    private boolean downloadsPerDayOfWeek;
    private boolean downloadsPerHourOfDay;
    private boolean searchesPerDayOfWeek;
    private boolean searchesPerHourOfDay;
    private boolean downloadsPerAgeStats;
    private boolean successfulDownloadsPerIndexer;
    private boolean downloadSharesPerUser;
    private boolean downloadSharesPerIp;
    private boolean searchSharesPerUser;
    private boolean searchSharesPerIp;
    private boolean userAgentSearchShares;
    private boolean userAgentDownloadShares;

    public StatsRequest(Instant after, Instant before, boolean includeDisabled) {
        this.before = before;
        this.after = after;
        this.includeDisabled = includeDisabled;
    }

}
