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

    protected Instant after = Instant.now().minus(30, ChronoUnit.DAYS);
    protected Instant before = Instant.now();
    protected boolean includeDisabled;

    protected boolean indexerApiAccessStats;
    protected boolean avgIndexerSearchResultsShares;
    protected boolean avgResponseTimes;
    protected boolean indexerDownloadShares;
    protected boolean downloadsPerDayOfWeek;
    protected boolean downloadsPerHourOfDay;
    protected boolean searchesPerDayOfWeek;
    protected boolean searchesPerHourOfDay;
    protected boolean downloadsPerAgeStats;
    protected boolean successfulDownloadsPerIndexer;
    protected boolean downloadSharesPerUser;
    protected boolean downloadSharesPerIp;
    protected boolean searchSharesPerUser;
    protected boolean searchSharesPerIp;
    protected boolean userAgentSearchShares;
    protected boolean userAgentDownloadShares;

    public StatsRequest(Instant after, Instant before, boolean includeDisabled) {
        this.before = before;
        this.after = after;
        this.includeDisabled = includeDisabled;
    }

}
