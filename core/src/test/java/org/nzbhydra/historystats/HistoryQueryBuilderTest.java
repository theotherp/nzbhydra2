package org.nzbhydra.historystats;

import org.junit.jupiter.api.Test;
import org.nzbhydra.historystats.HistoryQueryBuilder.HistoryQuery;
import org.nzbhydra.historystats.stats.HistoryRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HistoryQueryBuilderTest {

    @Test
    void shouldBindTimeBoundsAsLocalDateTimes() {
        Map<String, Object> timeBounds = new LinkedHashMap<>();
        timeBounds.put("before", "2026-10-07T12:34:56.789Z");
        timeBounds.put("after", "2026-10-01T00:00:00.000Z");

        HistoryQuery query = buildWithFilter(History.DOWNLOAD_TABLE, "time", new FilterDefinition(timeBounds, "time", null));

        assertThat(query.whereConditions()).isEqualTo(" WHERE time <= :p0 AND time >= :p1");
        assertThat(query.parameters()).containsExactly(
                Map.entry("p0", LocalDateTime.of(2026, 10, 7, 12, 34, 56, 789_000_000)),
                Map.entry("p1", LocalDateTime.of(2026, 10, 1, 0, 0, 0)));
    }

    @Test
    void shouldBindNumberRangeBoundsAsNumbers() {
        Map<String, Object> ageBounds = new LinkedHashMap<>();
        ageBounds.put("min", "10");
        ageBounds.put("max", 20);

        HistoryQuery query = buildWithFilter(History.DOWNLOAD_TABLE, "age", new FilterDefinition(ageBounds, "numberRange", null));

        assertThat(query.whereConditions()).isEqualTo(" WHERE age > :p0 AND age < :p1");
        assertThat(query.parameters()).containsExactly(Map.entry("p0", new BigDecimal("10")), Map.entry("p1", new BigDecimal("20")));
    }

    @Test
    void shouldBindTextFilters() {
        HistoryQuery freetext = buildWithFilter(History.DOWNLOAD_TABLE, "title", new FilterDefinition("Some Title", "freetext", null));
        assertThat(freetext.whereConditions()).isEqualTo(" WHERE LOWER(title) LIKE :p0");
        assertThat(freetext.parameters()).containsExactly(Map.entry("p0", "%some title%"));

        HistoryQuery text = buildWithFilter(History.DOWNLOAD_TABLE, "name", new FilterDefinition("Indexer", "text", null));
        assertThat(text.whereConditions()).isEqualTo(" WHERE LOWER(name) = :p0");
        assertThat(text.parameters()).containsExactly(Map.entry("p0", "indexer"));
    }

    @Test
    void shouldBindCheckboxesAndBooleanFilters() {
        HistoryQuery checkboxes = buildWithFilter(History.NOTIFICATION_TABLE, "notification_event_type",
                new FilterDefinition(List.of("INDEXER_DISABLED", "AUTH_FAILURE"), "checkboxes", null));
        assertThat(checkboxes.whereConditions()).isEqualTo(" WHERE NOTIFICATION_EVENT_TYPE IN :p0");
        assertThat(checkboxes.parameters()).containsExactly(Map.entry("p0", List.of("INDEXER_DISABLED", "AUTH_FAILURE")));

        HistoryQuery bool = buildWithFilter(History.DOWNLOAD_TABLE, "access_source", new FilterDefinition("API", "boolean", null));
        assertThat(bool.whereConditions()).isEqualTo(" WHERE access_source = :p0");
        assertThat(bool.parameters()).containsExactly(Map.entry("p0", "API"));
    }

    @Test
    void shouldIgnoreBooleanFilterWithAll() {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put("source", new FilterDefinition("all", "boolean", null));

        HistoryQuery query = HistoryQueryBuilder.build(request, History.SEARCH_TABLE);

        assertThat(query.whereConditions()).isEmpty();
        assertThat(query.parameters()).isEmpty();
    }

    @Test
    void shouldSortTextColumnsCaseInsensitivelyWithTimeAsTiebreak() {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("QUERY", 1));

        assertThat(HistoryQueryBuilder.build(request, History.SEARCH_TABLE).orderBy())
                .isEqualTo(" order by lower(query) ASC nulls last, time desc");
    }

    @Test
    void shouldSortTimeAndAgeAsTheyAre() {
        HistoryRequest byTime = new HistoryRequest();
        byTime.setSortModel(new SortModel("time", 2));
        assertThat(HistoryQueryBuilder.build(byTime, History.NOTIFICATION_TABLE).orderBy()).isEqualTo(" order by time DESC");

        HistoryRequest byAge = new HistoryRequest();
        byAge.setSortModel(new SortModel("age", 1));
        assertThat(HistoryQueryBuilder.build(byAge, History.DOWNLOAD_TABLE).orderBy()).isEqualTo(" order by age ASC, time desc");
    }

    @Test
    void shouldSortNewestFirstWithoutSortModel() {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(null);

        assertThat(HistoryQueryBuilder.build(request, History.SEARCH_TABLE).orderBy()).isEqualTo(" order by time desc");
    }

    @Test
    void shouldCalculatePaging() {
        HistoryRequest request = new HistoryRequest();
        request.setPage(3);
        request.setLimit(25);

        HistoryQuery query = HistoryQueryBuilder.build(request, History.SEARCH_TABLE);

        assertThat(query.limit()).isEqualTo(25);
        assertThat(query.offset()).isEqualTo(50);
    }

    @Test
    void shouldRejectFilterTypeNotMatchingColumn() {
        HistoryRequest numberOnText = new HistoryRequest();
        numberOnText.getFilterModel().put("title", new FilterDefinition(Map.of("min", "1"), "numberRange", null));
        assertThatThrownBy(() -> HistoryQueryBuilder.build(numberOnText, History.DOWNLOAD_TABLE))
                .isInstanceOf(InvalidHistoryRequestException.class);

        HistoryRequest timeOnText = new HistoryRequest();
        timeOnText.getFilterModel().put("query", new FilterDefinition(Map.of("after", "2026-10-01T00:00:00.000Z"), "time", null));
        assertThatThrownBy(() -> HistoryQueryBuilder.build(timeOnText, History.SEARCH_TABLE))
                .isInstanceOf(InvalidHistoryRequestException.class);
    }

    @Test
    void shouldRejectUnknownFilterType() {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put("query", new FilterDefinition("x", "raw", null));

        assertThatThrownBy(() -> HistoryQueryBuilder.build(request, History.SEARCH_TABLE))
                .isInstanceOf(InvalidHistoryRequestException.class);
    }

    @Test
    void shouldRejectTextFiltersOnNonTextColumns() {
        assertRejected(History.SEARCH_TABLE, "time", new FilterDefinition(List.of("x"), "checkboxes", null));
        assertRejected(History.DOWNLOAD_TABLE, "age", new FilterDefinition("abc", "boolean", null));
        assertRejected(History.DOWNLOAD_TABLE, "age", new FilterDefinition("abc", "freetext", null));
        assertRejected(History.NOTIFICATION_TABLE, "time", new FilterDefinition("abc", "text", null));
    }

    @Test
    void shouldBindBooleanFilterValueAsString() {
        HistoryQuery query = buildWithFilter(History.SEARCH_TABLE, "source", new FilterDefinition(Boolean.TRUE, "boolean", null));

        assertThat(query.parameters()).containsExactly(Map.entry("p0", "true"));
    }

    @Test
    void shouldRejectNumberBoundsOutOfRange() {
        assertRejected(History.DOWNLOAD_TABLE, "age", new FilterDefinition(Map.of("min", "1e999999999"), "numberRange", null));
        assertRejected(History.DOWNLOAD_TABLE, "age", new FilterDefinition(Map.of("max", "-9223372036854775809"), "numberRange", null));
        assertRejected(History.DOWNLOAD_TABLE, "age", new FilterDefinition(Map.of("min", "1e-999999999"), "numberRange", null));
    }

    @Test
    void shouldRejectTimeBoundsOutOfRange() {
        assertRejected(History.SEARCH_TABLE, "time", new FilterDefinition(Map.of("after", "+10000-01-01T00:00:00.000Z"), "time", null));
        assertRejected(History.SEARCH_TABLE, "time", new FilterDefinition(Map.of("before", "-0001-01-01T00:00:00.000Z"), "time", null));
    }

    private static void assertRejected(String table, String column, FilterDefinition definition) {
        assertThatThrownBy(() -> buildWithFilter(table, column, definition))
                .isInstanceOf(InvalidHistoryRequestException.class);
    }

    private static HistoryQuery buildWithFilter(String table, String column, FilterDefinition definition) {
        HistoryRequest request = new HistoryRequest();
        request.getFilterModel().put(column, definition);
        return HistoryQueryBuilder.build(request, table);
    }
}
