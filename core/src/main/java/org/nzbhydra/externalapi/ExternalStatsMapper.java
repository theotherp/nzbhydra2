package org.nzbhydra.externalapi;

import org.nzbhydra.externalapi.v1.ExternalAverageResponseTime;
import org.nzbhydra.externalapi.v1.ExternalCountPerDayOfWeek;
import org.nzbhydra.externalapi.v1.ExternalCountPerHourOfDay;
import org.nzbhydra.externalapi.v1.ExternalDownloadPerAge;
import org.nzbhydra.externalapi.v1.ExternalDownloadsPerAgeStats;
import org.nzbhydra.externalapi.v1.ExternalIndexerApiAccessStats;
import org.nzbhydra.externalapi.v1.ExternalIndexerDownloadShare;
import org.nzbhydra.externalapi.v1.ExternalIndexerScore;
import org.nzbhydra.externalapi.v1.ExternalSharePerUserOrIp;
import org.nzbhydra.externalapi.v1.ExternalStatsResponse;
import org.nzbhydra.externalapi.v1.ExternalStatsSection;
import org.nzbhydra.externalapi.v1.ExternalSuccessfulDownloadsPerIndexer;
import org.nzbhydra.externalapi.v1.ExternalUserAgentShare;
import org.nzbhydra.historystats.StatsResponse;
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
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * Builds the internal {@link StatsRequest} from the query parameters and maps the internal {@link StatsResponse} to
 * the contract class, field by field so that a rename inside the internal classes breaks compilation here.
 */
@Component
public class ExternalStatsMapper {

    public StatsRequest toStatsRequest(Instant after, Instant before, boolean includeDisabled, Set<ExternalStatsSection> sections) {
        StatsRequest request = new StatsRequest(after, before, includeDisabled);
        request.setIndexerApiAccessStats(sections.contains(ExternalStatsSection.INDEXER_API_ACCESS));
        request.setAvgIndexerUniquenessScore(sections.contains(ExternalStatsSection.INDEXER_SCORES));
        request.setAvgResponseTimes(sections.contains(ExternalStatsSection.AVG_RESPONSE_TIMES));
        request.setIndexerDownloadShares(sections.contains(ExternalStatsSection.INDEXER_DOWNLOAD_SHARES));
        request.setDownloadsPerDayOfWeek(sections.contains(ExternalStatsSection.DOWNLOADS_PER_DAY_OF_WEEK));
        request.setDownloadsPerHourOfDay(sections.contains(ExternalStatsSection.DOWNLOADS_PER_HOUR_OF_DAY));
        request.setSearchesPerDayOfWeek(sections.contains(ExternalStatsSection.SEARCHES_PER_DAY_OF_WEEK));
        request.setSearchesPerHourOfDay(sections.contains(ExternalStatsSection.SEARCHES_PER_HOUR_OF_DAY));
        request.setDownloadsPerAgeStats(sections.contains(ExternalStatsSection.DOWNLOADS_PER_AGE));
        request.setSuccessfulDownloadsPerIndexer(sections.contains(ExternalStatsSection.SUCCESSFUL_DOWNLOADS_PER_INDEXER));
        request.setDownloadSharesPerUser(sections.contains(ExternalStatsSection.DOWNLOAD_SHARES_PER_USER));
        request.setDownloadSharesPerIp(sections.contains(ExternalStatsSection.DOWNLOAD_SHARES_PER_IP));
        request.setSearchSharesPerUser(sections.contains(ExternalStatsSection.SEARCH_SHARES_PER_USER));
        request.setSearchSharesPerIp(sections.contains(ExternalStatsSection.SEARCH_SHARES_PER_IP));
        request.setUserAgentSearchShares(sections.contains(ExternalStatsSection.USER_AGENT_SEARCH_SHARES));
        request.setUserAgentDownloadShares(sections.contains(ExternalStatsSection.USER_AGENT_DOWNLOAD_SHARES));
        return request;
    }

    public ExternalStatsResponse toExternalStatsResponse(StatsResponse response, boolean includeDisabled) {
        ExternalStatsResponse external = new ExternalStatsResponse();
        external.setAfter(response.getAfter());
        external.setBefore(response.getBefore());
        external.setIncludeDisabled(includeDisabled);
        external.setNumberOfConfiguredIndexers(response.getNumberOfConfiguredIndexers());
        external.setNumberOfEnabledIndexers(response.getNumberOfEnabledIndexers());
        external.setIndexerApiAccessStats(map(response.getIndexerApiAccessStats(), this::toIndexerApiAccessStats));
        external.setIndexerScores(map(response.getIndexerScores(), this::toIndexerScore));
        external.setAvgResponseTimes(map(response.getAvgResponseTimes(), this::toAverageResponseTime));
        external.setIndexerDownloadShares(map(response.getIndexerDownloadShares(), this::toIndexerDownloadShare));
        external.setDownloadsPerDayOfWeek(map(response.getDownloadsPerDayOfWeek(), this::toCountPerDayOfWeek));
        external.setDownloadsPerHourOfDay(map(response.getDownloadsPerHourOfDay(), this::toCountPerHourOfDay));
        external.setSearchesPerDayOfWeek(map(response.getSearchesPerDayOfWeek(), this::toCountPerDayOfWeek));
        external.setSearchesPerHourOfDay(map(response.getSearchesPerHourOfDay(), this::toCountPerHourOfDay));
        external.setSuccessfulDownloadsPerIndexer(map(response.getSuccessfulDownloadsPerIndexer(), this::toSuccessfulDownloadsPerIndexer));
        external.setDownloadSharesPerUser(map(response.getDownloadSharesPerUser(), this::toSharePerUserOrIp));
        external.setDownloadSharesPerIp(map(response.getDownloadSharesPerIp(), this::toSharePerUserOrIp));
        external.setSearchSharesPerUser(map(response.getSearchSharesPerUser(), this::toSharePerUserOrIp));
        external.setSearchSharesPerIp(map(response.getSearchSharesPerIp(), this::toSharePerUserOrIp));
        external.setUserAgentSearchShares(map(response.getUserAgentSearchShares(), this::toUserAgentShare));
        external.setUserAgentDownloadShares(map(response.getUserAgentDownloadShares(), this::toUserAgentShare));
        external.setDownloadsPerAgeStats(toDownloadsPerAgeStats(response.getDownloadsPerAgeStats()));
        return external;
    }

    ExternalIndexerApiAccessStats toIndexerApiAccessStats(IndexerApiAccessStatsEntry entry) {
        return new ExternalIndexerApiAccessStats(entry.getIndexerName(), entry.getPercentSuccessful(),
                entry.getPercentConnectionError(), entry.getAverageAccessesPerDay());
    }

    ExternalIndexerScore toIndexerScore(IndexerScore score) {
        return new ExternalIndexerScore(score.getIndexerName(), score.getAverageUniquenessScore(),
                score.getInvolvedSearches(), score.getUniqueDownloads(), score.getProvidedDownloads(),
                score.getCoveragePercent(), score.getExclusivePercent(), score.getSharedContribution(),
                score.getSharedContributionPercent(), score.getLegacyObservations(), score.getCorrectedObservations());
    }

    ExternalAverageResponseTime toAverageResponseTime(AverageResponseTime responseTime) {
        return new ExternalAverageResponseTime(responseTime.getIndexer(), responseTime.getAvgResponseTime(), responseTime.getDelta());
    }

    ExternalIndexerDownloadShare toIndexerDownloadShare(IndexerDownloadShare share) {
        return new ExternalIndexerDownloadShare(share.getIndexerName(), share.getTotal(), share.getShare());
    }

    ExternalCountPerDayOfWeek toCountPerDayOfWeek(CountPerDayOfWeek count) {
        return new ExternalCountPerDayOfWeek(count.getDay(), count.getCount());
    }

    ExternalCountPerHourOfDay toCountPerHourOfDay(CountPerHourOfDay count) {
        return new ExternalCountPerHourOfDay(count.getHour(), count.getCount());
    }

    ExternalSuccessfulDownloadsPerIndexer toSuccessfulDownloadsPerIndexer(SuccessfulDownloadsPerIndexer downloads) {
        return new ExternalSuccessfulDownloadsPerIndexer(downloads.getIndexerName(), downloads.getCountAll(),
                downloads.getCountSuccessful(), downloads.getCountError(), downloads.getPercentSuccessful());
    }

    ExternalSharePerUserOrIp toSharePerUserOrIp(DownloadOrSearchSharePerUserOrIp share) {
        return new ExternalSharePerUserOrIp(share.getKey(), share.getCount(), share.getPercentage());
    }

    ExternalUserAgentShare toUserAgentShare(UserAgentShare share) {
        return new ExternalUserAgentShare(share.getUserAgent(), share.getCount(), share.getPercentage());
    }

    ExternalDownloadsPerAgeStats toDownloadsPerAgeStats(DownloadPerAgeStats stats) {
        if (stats == null) {
            return null;
        }
        return new ExternalDownloadsPerAgeStats(stats.getPercentOlder1000(), stats.getPercentOlder2000(),
                stats.getPercentOlder3000(), stats.getAverageAge(), map(stats.getDownloadsPerAge(), this::toDownloadPerAge));
    }

    ExternalDownloadPerAge toDownloadPerAge(DownloadPerAge downloadPerAge) {
        return new ExternalDownloadPerAge(downloadPerAge.getAge(), downloadPerAge.getCount());
    }

    /**
     * A section that was not requested stays {@code null} rather than becoming an empty list, so that a client can
     * tell "not calculated" from "nothing to report".
     */
    private <I, E> List<E> map(Collection<I> input, Function<I, E> mapper) {
        if (input == null) {
            return null;
        }
        return input.stream().map(mapper).toList();
    }
}
