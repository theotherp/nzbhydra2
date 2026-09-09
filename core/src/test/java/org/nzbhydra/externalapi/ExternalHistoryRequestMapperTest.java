package org.nzbhydra.externalapi;

import org.junit.jupiter.api.Test;
import org.nzbhydra.externalapi.ExternalHistoryRequestMapper.CommonParams;
import org.nzbhydra.historystats.FilterDefinition;
import org.nzbhydra.historystats.stats.HistoryRequest;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The exact {@link HistoryRequest} the external history routes build: the column names and filter types are the ones
 * {@code History.getHistory} understands, so they are asserted literally rather than through the mapper's constants.
 */
class ExternalHistoryRequestMapperTest {

    private final ExternalHistoryRequestMapper testee = new ExternalHistoryRequestMapper();

    @Test
    void shouldDefaultToTheFirstPageOfAHundredNewestFirst() {
        CommonParams common = testee.commonParams(null, null, null, null, null);

        assertThat(common.page()).isEqualTo(1);
        assertThat(common.limit()).isEqualTo(100);
        assertThat(common.from()).isNull();
        assertThat(common.to()).isNull();
        assertThat(common.ascending()).isFalse();

        HistoryRequest request = testee.forSearches(common, null, null, null, null);
        assertThat(request.getPage()).isEqualTo(1);
        assertThat(request.getLimit()).isEqualTo(100);
        assertThat(request.getSortModel().getColumn()).isEqualTo("time");
        assertThat(request.getSortModel().getSortMode()).isEqualTo(2);
        assertThat(request.getFilterModel()).isEmpty();
    }

    @Test
    void shouldSortAscendingOnRequest() {
        assertThat(testee.forSearches(testee.commonParams(null, null, null, null, "asc"), null, null, null, null)
                .getSortModel().getSortMode()).isEqualTo(1);
        assertThat(testee.forSearches(testee.commonParams(null, null, null, null, "DESC"), null, null, null, null)
                .getSortModel().getSortMode()).isEqualTo(2);
    }

    @Test
    void shouldRejectAnInvalidOrder() {
        assertThatThrownBy(() -> testee.commonParams(null, null, null, null, "sideways"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("order");
    }

    @Test
    void shouldRejectAPageBelowOneAndALimitOutsideTheAllowedRange() {
        assertThatThrownBy(() -> testee.commonParams(0, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("page");
        assertThatThrownBy(() -> testee.commonParams(null, 501, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limit");
        assertThatThrownBy(() -> testee.commonParams(null, 0, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limit");
        assertThat(testee.commonParams(null, 500, null, null, null).limit()).isEqualTo(500);
    }

    @Test
    void shouldRejectAnInstantThatIsNotIso8601() {
        assertThatThrownBy(() -> testee.commonParams(null, null, "yesterday", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("from");
        assertThatThrownBy(() -> testee.commonParams(null, null, null, "yesterday", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("to");
    }

    @Test
    void shouldAcceptAnInstantWithAnExplicitOffset() {
        CommonParams common = testee.commonParams(null, null, "2026-09-09T14:00:00+02:00", null, null);

        assertThat(common.from()).isEqualTo(Instant.parse("2026-09-09T12:00:00Z"));
    }

    /**
     * {@code History.getHistory} strips the {@code T} and the {@code Z} and hands the rest to H2's
     * {@code PARSEDATETIME} with the pattern {@code yyyy-MM-ddHH:mm:ss.SSS}, so a bound has to carry exactly three
     * fractional digits and no offset.
     */
    @SuppressWarnings("unchecked")
    @Test
    void shouldTranslateTheTimeRangeIntoTheFormatHistoryParses() {
        CommonParams common = testee.commonParams(null, null, "2026-09-09T12:00:00Z", "2026-09-10T13:14:15.678Z", null);

        FilterDefinition definition = testee.forSearches(common, null, null, null, null).getFilterModel().get("time");

        assertThat(definition.getFilterType()).isEqualTo("time");
        assertThat((Map<String, String>) definition.getFilterValue())
                .containsExactlyInAnyOrderEntriesOf(Map.of(
                        "after", "2026-09-09T12:00:00.000Z",
                        "before", "2026-09-10T13:14:15.678Z"));
    }

    @Test
    void shouldOnlyAddTheBoundThatWasGiven() {
        @SuppressWarnings("unchecked")
        Map<String, String> onlyFrom = (Map<String, String>) testee
                .forSearches(testee.commonParams(null, null, "2026-09-09T12:00:00Z", null, null), null, null, null, null)
                .getFilterModel().get("time").getFilterValue();

        assertThat(onlyFrom).containsOnlyKeys("after");
    }

    @Test
    void shouldBuildTheSearchFiltersOnTheColumnsHistoryKnows() {
        HistoryRequest request = testee.forSearches(testee.commonParams(2, 25, null, null, null),
                "the query", "theuser", "10.0.0.1", "Sonarr");

        assertThat(request.getPage()).isEqualTo(2);
        assertThat(request.getLimit()).isEqualTo(25);
        assertThat(request.getFilterModel()).containsOnlyKeys("query", "username", "ip", "user_agent");
        assertFreetext(request.getFilterModel().get("query"), "the query");
        assertFreetext(request.getFilterModel().get("username"), "theuser");
        assertFreetext(request.getFilterModel().get("ip"), "10.0.0.1");
        assertFreetext(request.getFilterModel().get("user_agent"), "Sonarr");
    }

    @Test
    void shouldBuildTheDownloadFiltersWithExactMatchesForIndexerAndStatus() {
        HistoryRequest request = testee.forDownloads(testee.commonParams(null, null, null, null, null),
                "some title", "anIndexer", "NZB_ADDED", "theuser", "10.0.0.1", "Sonarr");

        assertThat(request.getFilterModel()).containsOnlyKeys("title", "name", "status", "username", "ip", "user_agent");
        assertFreetext(request.getFilterModel().get("title"), "some title");
        assertExact(request.getFilterModel().get("name"), "anIndexer");
        assertExact(request.getFilterModel().get("status"), "NZB_ADDED");
    }

    @Test
    void shouldBuildTheNotificationFiltersOnTheEnumColumns() {
        HistoryRequest request = testee.forNotifications(testee.commonParams(null, null, null, null, null),
                "RESULT_DOWNLOAD", "INFO");

        assertThat(request.getFilterModel()).containsOnlyKeys("NOTIFICATION_EVENT_TYPE", "MESSAGE_TYPE");
        assertExact(request.getFilterModel().get("NOTIFICATION_EVENT_TYPE"), "RESULT_DOWNLOAD");
        assertExact(request.getFilterModel().get("MESSAGE_TYPE"), "INFO");
    }

    @Test
    void shouldIgnoreBlankFilters() {
        HistoryRequest request = testee.forSearches(testee.commonParams(null, null, null, null, null), "  ", "", null, null);

        assertThat(request.getFilterModel()).isEmpty();
    }

    private void assertFreetext(FilterDefinition definition, String expected) {
        assertThat(definition.getFilterType()).isEqualTo("freetext");
        assertThat(definition.getFilterValue()).isEqualTo(expected);
    }

    private void assertExact(FilterDefinition definition, String expected) {
        assertThat(definition.getFilterType()).isEqualTo("checkboxes");
        assertThat(definition.getFilterValue()).isEqualTo(List.of(expected));
    }
}
