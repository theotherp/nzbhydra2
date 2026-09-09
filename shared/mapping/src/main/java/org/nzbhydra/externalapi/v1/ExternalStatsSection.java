package org.nzbhydra.externalapi.v1;

import io.swagger.v3.oas.annotations.media.Schema;
import org.nzbhydra.springnative.ReflectionMarker;

/**
 * The parts of {@link ExternalStatsResponse} that can be requested individually with the {@code section} query
 * parameter. A section that was not requested is {@code null} in the response.
 */
@ReflectionMarker
@Schema(description = "One part of the statistics. A section that was not requested is null in the response.")
public enum ExternalStatsSection {
    INDEXER_API_ACCESS,
    INDEXER_SCORES,
    AVG_RESPONSE_TIMES,
    INDEXER_DOWNLOAD_SHARES,
    DOWNLOADS_PER_DAY_OF_WEEK,
    DOWNLOADS_PER_HOUR_OF_DAY,
    SEARCHES_PER_DAY_OF_WEEK,
    SEARCHES_PER_HOUR_OF_DAY,
    DOWNLOADS_PER_AGE,
    SUCCESSFUL_DOWNLOADS_PER_INDEXER,
    DOWNLOAD_SHARES_PER_USER,
    DOWNLOAD_SHARES_PER_IP,
    SEARCH_SHARES_PER_USER,
    SEARCH_SHARES_PER_IP,
    USER_AGENT_SEARCH_SHARES,
    USER_AGENT_DOWNLOAD_SHARES
}
