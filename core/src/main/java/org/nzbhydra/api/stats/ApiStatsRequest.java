

package org.nzbhydra.api.stats;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.springnative.ReflectionMarker;

@AllArgsConstructor
@Data
@ReflectionMarker
public class ApiStatsRequest {

    protected String apikey;
    private StatsRequest request = new StatsRequest();

    public ApiStatsRequest() {
        request.setIncludeDisabled(false);
        request.setIndexerApiAccessStats(true);
        request.setAvgIndexerUniquenessScore(true);
        request.setAvgResponseTimes(true);
        request.setIndexerDownloadShares(true);
        request.setDownloadsPerDayOfWeek(true);
        request.setDownloadsPerHourOfDay(true);
        request.setSearchesPerDayOfWeek(true);
        request.setSearchesPerHourOfDay(true);
        request.setDownloadsPerAgeStats(true);
        request.setSuccessfulDownloadsPerIndexer(true);
        request.setDownloadSharesPerUser(true);
        request.setDownloadSharesPerIp(true);
        request.setSearchSharesPerUser(true);
        request.setSearchSharesPerIp(true);
        request.setUserAgentSearchShares(true);
        request.setUserAgentDownloadShares(true);
    }

}
