package org.nzbhydra.externalapi.v1;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.List;

/**
 * Answer of {@code GET /externalapi/v1/stats}.
 *
 * <p>Every list is {@code null} when its {@link ExternalStatsSection} was not requested, and may be empty when there
 * is no data for the time range.
 */
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Aggregated statistics for a time range. A section that was not requested is null.")
public class ExternalStatsResponse {

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "Start of the time range the statistics were calculated for, inclusive")
    private Instant after;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    @Schema(description = "End of the time range the statistics were calculated for")
    private Instant before;

    @Schema(description = "Whether disabled indexers were included")
    private boolean includeDisabled;

    @Schema(description = "How many indexers are configured")
    private Integer numberOfConfiguredIndexers;

    @Schema(description = "How many of the configured indexers are enabled")
    private Integer numberOfEnabledIndexers;

    @Schema(description = "Section INDEXER_API_ACCESS: how often each indexer was called and how well")
    private List<ExternalIndexerApiAccessStats> indexerApiAccessStats;

    @Schema(description = "Section INDEXER_SCORES: how much unique content each indexer contributed")
    private List<ExternalIndexerScore> indexerScores;

    @Schema(description = "Section AVG_RESPONSE_TIMES: average response time per indexer")
    private List<ExternalAverageResponseTime> avgResponseTimes;

    @Schema(description = "Section INDEXER_DOWNLOAD_SHARES: share of all downloads per indexer")
    private List<ExternalIndexerDownloadShare> indexerDownloadShares;

    @Schema(description = "Section DOWNLOADS_PER_DAY_OF_WEEK: downloads per day of the week")
    private List<ExternalCountPerDayOfWeek> downloadsPerDayOfWeek;

    @Schema(description = "Section DOWNLOADS_PER_HOUR_OF_DAY: downloads per hour of the day")
    private List<ExternalCountPerHourOfDay> downloadsPerHourOfDay;

    @Schema(description = "Section SEARCHES_PER_DAY_OF_WEEK: searches per day of the week")
    private List<ExternalCountPerDayOfWeek> searchesPerDayOfWeek;

    @Schema(description = "Section SEARCHES_PER_HOUR_OF_DAY: searches per hour of the day")
    private List<ExternalCountPerHourOfDay> searchesPerHourOfDay;

    @Schema(description = "Section SUCCESSFUL_DOWNLOADS_PER_INDEXER: successful and failed downloads per indexer")
    private List<ExternalSuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer;

    @Schema(description = "Section DOWNLOAD_SHARES_PER_USER: share of all downloads per user")
    private List<ExternalSharePerUserOrIp> downloadSharesPerUser;

    @Schema(description = "Section DOWNLOAD_SHARES_PER_IP: share of all downloads per IP")
    private List<ExternalSharePerUserOrIp> downloadSharesPerIp;

    @Schema(description = "Section SEARCH_SHARES_PER_USER: share of all searches per user")
    private List<ExternalSharePerUserOrIp> searchSharesPerUser;

    @Schema(description = "Section SEARCH_SHARES_PER_IP: share of all searches per IP")
    private List<ExternalSharePerUserOrIp> searchSharesPerIp;

    @Schema(description = "Section USER_AGENT_SEARCH_SHARES: share of all searches per user agent")
    private List<ExternalUserAgentShare> userAgentSearchShares;

    @Schema(description = "Section USER_AGENT_DOWNLOAD_SHARES: share of all downloads per user agent")
    private List<ExternalUserAgentShare> userAgentDownloadShares;

    @Schema(description = "Section DOWNLOADS_PER_AGE: how old the downloaded content was")
    private ExternalDownloadsPerAgeStats downloadsPerAgeStats;
}
