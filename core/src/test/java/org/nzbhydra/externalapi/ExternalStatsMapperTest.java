package org.nzbhydra.externalapi;

import org.junit.jupiter.api.Test;
import org.nzbhydra.externalapi.v1.ExternalStatsResponse;
import org.nzbhydra.externalapi.v1.ExternalStatsSection;
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

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Field by field for one populated instance of every internal stats class, so that a rename or a reordering on either
 * side of the mapping shows up here rather than in somebody's dashboard.
 */
class ExternalStatsMapperTest {

    private static final Instant AFTER = Instant.parse("2026-08-09T00:00:00Z");
    private static final Instant BEFORE = Instant.parse("2026-09-09T00:00:00Z");

    private final ExternalStatsMapper testee = new ExternalStatsMapper();

    @Test
    void shouldRequestOnlyTheSectionsThatWereAskedFor() {
        StatsRequest request = testee.toStatsRequest(AFTER, BEFORE, true,
                EnumSet.of(ExternalStatsSection.INDEXER_SCORES, ExternalStatsSection.DOWNLOADS_PER_AGE));

        assertThat(request.getAfter()).isEqualTo(AFTER);
        assertThat(request.getBefore()).isEqualTo(BEFORE);
        assertThat(request.isIncludeDisabled()).isTrue();
        assertThat(request.isAvgIndexerUniquenessScore()).isTrue();
        assertThat(request.isDownloadsPerAgeStats()).isTrue();
        assertThat(request.isIndexerApiAccessStats()).isFalse();
        assertThat(request.isAvgResponseTimes()).isFalse();
        assertThat(request.isIndexerDownloadShares()).isFalse();
        assertThat(request.isDownloadsPerDayOfWeek()).isFalse();
        assertThat(request.isDownloadsPerHourOfDay()).isFalse();
        assertThat(request.isSearchesPerDayOfWeek()).isFalse();
        assertThat(request.isSearchesPerHourOfDay()).isFalse();
        assertThat(request.isSuccessfulDownloadsPerIndexer()).isFalse();
        assertThat(request.isDownloadSharesPerUser()).isFalse();
        assertThat(request.isDownloadSharesPerIp()).isFalse();
        assertThat(request.isSearchSharesPerUser()).isFalse();
        assertThat(request.isSearchSharesPerIp()).isFalse();
        assertThat(request.isUserAgentSearchShares()).isFalse();
        assertThat(request.isUserAgentDownloadShares()).isFalse();
    }

    @Test
    void shouldRequestEverySectionWhenAllAreAskedFor() {
        StatsRequest request = testee.toStatsRequest(AFTER, BEFORE, false, EnumSet.allOf(ExternalStatsSection.class));

        assertThat(request.isIndexerApiAccessStats()).isTrue();
        assertThat(request.isAvgIndexerUniquenessScore()).isTrue();
        assertThat(request.isAvgResponseTimes()).isTrue();
        assertThat(request.isIndexerDownloadShares()).isTrue();
        assertThat(request.isDownloadsPerDayOfWeek()).isTrue();
        assertThat(request.isDownloadsPerHourOfDay()).isTrue();
        assertThat(request.isSearchesPerDayOfWeek()).isTrue();
        assertThat(request.isSearchesPerHourOfDay()).isTrue();
        assertThat(request.isDownloadsPerAgeStats()).isTrue();
        assertThat(request.isSuccessfulDownloadsPerIndexer()).isTrue();
        assertThat(request.isDownloadSharesPerUser()).isTrue();
        assertThat(request.isDownloadSharesPerIp()).isTrue();
        assertThat(request.isSearchSharesPerUser()).isTrue();
        assertThat(request.isSearchSharesPerIp()).isTrue();
        assertThat(request.isUserAgentSearchShares()).isTrue();
        assertThat(request.isUserAgentDownloadShares()).isTrue();
    }

    @Test
    void shouldMapEveryFieldOfAFullyPopulatedResponse() {
        ExternalStatsResponse external = testee.toExternalStatsResponse(populatedResponse(), true);

        assertThat(external.getAfter()).isEqualTo(AFTER);
        assertThat(external.getBefore()).isEqualTo(BEFORE);
        assertThat(external.isIncludeDisabled()).isTrue();
        assertThat(external.getNumberOfConfiguredIndexers()).isEqualTo(7);
        assertThat(external.getNumberOfEnabledIndexers()).isEqualTo(5);

        assertThat(external.getIndexerApiAccessStats()).singleElement().satisfies(entry -> {
            assertThat(entry.getIndexerName()).isEqualTo("anIndexer");
            assertThat(entry.getPercentSuccessful()).isEqualTo(90.5D);
            assertThat(entry.getPercentConnectionError()).isEqualTo(1.5D);
            assertThat(entry.getAverageAccessesPerDay()).isEqualTo(12.25D);
        });
        assertThat(external.getIndexerScores()).singleElement().satisfies(score -> {
            assertThat(score.getIndexerName()).isEqualTo("anIndexer");
            assertThat(score.getAverageUniquenessScore()).isEqualTo(42);
            assertThat(score.getInvolvedSearches()).isEqualTo(100L);
            assertThat(score.getUniqueDownloads()).isEqualTo(20L);
            assertThat(score.getProvidedDownloads()).isEqualTo(30L);
            assertThat(score.getCoveragePercent()).isEqualTo(60);
            assertThat(score.getExclusivePercent()).isEqualTo(10);
            assertThat(score.getSharedContribution()).isEqualTo(1.5D);
            assertThat(score.getSharedContributionPercent()).isEqualTo(15);
            assertThat(score.getLegacyObservations()).isEqualTo(3L);
            assertThat(score.getCorrectedObservations()).isEqualTo(4L);
        });
        assertThat(external.getAvgResponseTimes()).singleElement().satisfies(time -> {
            assertThat(time.getIndexer()).isEqualTo("anIndexer");
            assertThat(time.getAvgResponseTime()).isEqualTo(1234D);
            assertThat(time.getDelta()).isEqualTo(-56D);
        });
        assertThat(external.getIndexerDownloadShares()).singleElement().satisfies(share -> {
            assertThat(share.getIndexerName()).isEqualTo("anIndexer");
            assertThat(share.getTotal()).isEqualTo(17L);
            assertThat(share.getShare()).isEqualTo(33.5F);
        });
        assertThat(external.getDownloadsPerDayOfWeek()).singleElement().satisfies(count -> {
            assertThat(count.getDay()).isEqualTo("Mon");
            assertThat(count.getCount()).isEqualTo(3);
        });
        assertThat(external.getSearchesPerDayOfWeek()).singleElement().satisfies(count ->
                assertThat(count.getDay()).isEqualTo("Tue"));
        assertThat(external.getDownloadsPerHourOfDay()).singleElement().satisfies(count -> {
            assertThat(count.getHour()).isEqualTo(13);
            assertThat(count.getCount()).isEqualTo(4);
        });
        assertThat(external.getSearchesPerHourOfDay()).singleElement().satisfies(count ->
                assertThat(count.getHour()).isEqualTo(14));
        assertThat(external.getSuccessfulDownloadsPerIndexer()).singleElement().satisfies(downloads -> {
            assertThat(downloads.getIndexerName()).isEqualTo("anIndexer");
            assertThat(downloads.getCountAll()).isEqualTo(10);
            assertThat(downloads.getCountSuccessful()).isEqualTo(8);
            assertThat(downloads.getCountError()).isEqualTo(2);
            assertThat(downloads.getPercentSuccessful()).isEqualTo(80F);
        });
        assertThat(external.getDownloadSharesPerUser()).singleElement().satisfies(share -> {
            assertThat(share.getKey()).isEqualTo("downloadUser");
            assertThat(share.getCount()).isEqualTo(1);
            assertThat(share.getPercentage()).isEqualTo(11F);
        });
        assertThat(external.getDownloadSharesPerIp()).singleElement().satisfies(share ->
                assertThat(share.getKey()).isEqualTo("downloadIp"));
        assertThat(external.getSearchSharesPerUser()).singleElement().satisfies(share ->
                assertThat(share.getKey()).isEqualTo("searchUser"));
        assertThat(external.getSearchSharesPerIp()).singleElement().satisfies(share ->
                assertThat(share.getKey()).isEqualTo("searchIp"));
        assertThat(external.getUserAgentSearchShares()).singleElement().satisfies(share -> {
            assertThat(share.getUserAgent()).isEqualTo("Sonarr");
            assertThat(share.getCount()).isEqualTo(5);
            assertThat(share.getPercentage()).isEqualTo(50F);
        });
        assertThat(external.getUserAgentDownloadShares()).singleElement().satisfies(share ->
                assertThat(share.getUserAgent()).isEqualTo("Radarr"));
        assertThat(external.getDownloadsPerAgeStats()).satisfies(ages -> {
            assertThat(ages.getPercentOlder1000()).isEqualTo(30);
            assertThat(ages.getPercentOlder2000()).isEqualTo(20);
            assertThat(ages.getPercentOlder3000()).isEqualTo(10);
            assertThat(ages.getAverageAge()).isEqualTo(500);
            assertThat(ages.getDownloadsPerAge()).singleElement().satisfies(age -> {
                assertThat(age.getAge()).isEqualTo(100);
                assertThat(age.getCount()).isEqualTo(2);
            });
        });
    }

    /**
     * A section that was not calculated must stay null so a client can tell it apart from one that simply has no data.
     */
    @Test
    void shouldLeaveSectionsThatWereNotCalculatedNull() {
        StatsResponse response = new StatsResponse();
        response.setAfter(AFTER);
        response.setBefore(BEFORE);

        ExternalStatsResponse external = testee.toExternalStatsResponse(response, false);

        assertThat(external.getIndexerApiAccessStats()).isNull();
        assertThat(external.getIndexerScores()).isNull();
        assertThat(external.getDownloadsPerAgeStats()).isNull();
        assertThat(external.isIncludeDisabled()).isFalse();
    }

    private StatsResponse populatedResponse() {
        StatsResponse response = new StatsResponse();
        response.setAfter(AFTER);
        response.setBefore(BEFORE);
        response.setNumberOfConfiguredIndexers(7);
        response.setNumberOfEnabledIndexers(5);

        IndexerApiAccessStatsEntry apiAccess = new IndexerApiAccessStatsEntry();
        apiAccess.setIndexerName("anIndexer");
        apiAccess.setPercentSuccessful(90.5D);
        apiAccess.setPercentConnectionError(1.5D);
        apiAccess.setAverageAccessesPerDay(12.25D);
        response.setIndexerApiAccessStats(List.of(apiAccess));

        response.setIndexerScores(List.of(new IndexerScore("anIndexer", 42, 100L, 20L, 30L, 60, 10, 1.5D, 15, 3L, 4L)));
        response.setAvgResponseTimes(List.of(new AverageResponseTime("anIndexer", 1234D, -56D)));
        response.setIndexerDownloadShares(List.of(new IndexerDownloadShare("anIndexer", 17L, 33.5F)));
        response.setDownloadsPerDayOfWeek(List.of(new CountPerDayOfWeek(1, 3)));
        response.setSearchesPerDayOfWeek(List.of(new CountPerDayOfWeek(2, 6)));
        response.setDownloadsPerHourOfDay(List.of(new CountPerHourOfDay(13, 4)));
        response.setSearchesPerHourOfDay(List.of(new CountPerHourOfDay(14, 7)));
        response.setSuccessfulDownloadsPerIndexer(List.of(new SuccessfulDownloadsPerIndexer("anIndexer", 10, 8, 2, 80F)));
        response.setDownloadSharesPerUser(List.of(new DownloadOrSearchSharePerUserOrIp("downloadUser", 1, 11F)));
        response.setDownloadSharesPerIp(List.of(new DownloadOrSearchSharePerUserOrIp("downloadIp", 2, 22F)));
        response.setSearchSharesPerUser(List.of(new DownloadOrSearchSharePerUserOrIp("searchUser", 3, 33F)));
        response.setSearchSharesPerIp(List.of(new DownloadOrSearchSharePerUserOrIp("searchIp", 4, 44F)));
        response.setUserAgentSearchShares(List.of(new UserAgentShare("Sonarr", 5, 50F)));
        response.setUserAgentDownloadShares(List.of(new UserAgentShare("Radarr", 6, 60F)));

        DownloadPerAgeStats ageStats = new DownloadPerAgeStats();
        ageStats.setPercentOlder1000(30);
        ageStats.setPercentOlder2000(20);
        ageStats.setPercentOlder3000(10);
        ageStats.setAverageAge(500);
        ageStats.setDownloadsPerAge(List.of(new DownloadPerAge(100, 2)));
        response.setDownloadsPerAgeStats(ageStats);
        return response;
    }
}
