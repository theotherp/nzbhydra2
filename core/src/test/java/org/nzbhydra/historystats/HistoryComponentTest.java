package org.nzbhydra.historystats;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.notifications.NotificationMessageType;
import org.nzbhydra.notifications.NotificationRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs {@link History#getHistory} against the real H2 schema, so the generated SQL and the bound parameters are
 * checked by the database itself.
 */
@SpringBootTest(classes = NzbHydra.class)
class HistoryComponentTest {

    /**
     * The format the web UI sends ({@code Date.toISOString()}).
     */
    private static final DateTimeFormatter UI_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    @Autowired
    private History history;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private FileDownloadRepository downloadRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private NotificationRepository notificationRepository;

    @BeforeEach
    void setUp() {
        deleteAllRows();
        searchRepository.save(search("alpha", "Movies", SearchSource.INTERNAL, "alice", "1.1.1.1", "Firefox", 10));
        searchRepository.save(search("Bravo", "TV", SearchSource.API, "bob", "2.2.2.2", "Sonarr", 5));
        searchRepository.save(search("charlie", "Movies", SearchSource.API, null, "3.3.3.3", "Radarr", 0));

        IndexerEntity indexer1 = indexerRepository.save(new IndexerEntity("indexer1"));
        IndexerEntity indexer2 = indexerRepository.save(new IndexerEntity("indexer2"));
        SearchResultEntity result1 = searchResult(indexer1, "First.Title");
        SearchResultEntity result2 = searchResult(indexer2, "second.title");
        SearchResultEntity result3 = searchResult(indexer1, "Third.Title");
        searchResultRepository.saveAll(List.of(result1, result2, result3));
        downloadRepository.save(download(result1, FileDownloadStatus.NZB_ADDED, SearchSource.INTERNAL, 100, "alice", 10));
        downloadRepository.save(download(result2, FileDownloadStatus.NZB_ADD_ERROR, SearchSource.API, 2000, "bob", 5));
        downloadRepository.save(download(result3, FileDownloadStatus.NZB_ADDED, SearchSource.API, 500, null, 0));

        notificationRepository.save(new NotificationEntity(NotificationEventType.INDEXER_DISABLED, NotificationMessageType.WARNING, "t1", "b1", null, daysAgo(10)));
        notificationRepository.save(new NotificationEntity(NotificationEventType.AUTH_FAILURE, NotificationMessageType.FAILURE, "t2", "b2", null, daysAgo(5)));
        notificationRepository.save(new NotificationEntity(NotificationEventType.UPDATE_INSTALLED, NotificationMessageType.INFO, "t3", "b3", null, daysAgo(0)));
    }

    @AfterEach
    void tearDown() {
        //The Spring context is cached and shared with other test classes, so leave an empty database behind
        deleteAllRows();
    }

    private void deleteAllRows() {
        downloadRepository.deleteAll();
        searchResultRepository.deleteAll();
        indexerSearchRepository.deleteAll();
        searchRepository.deleteAll();
        notificationRepository.deleteAll();
        indexerRepository.deleteAll();
    }

    @Test
    void shouldFilterSearchesByEveryFilterType() {
        assertThat(searchQueries(filter("query", "RAV", "freetext"))).containsExactly("Bravo");
        assertThat(searchQueries(filter("query", "ALPHA", "text"))).containsExactly("alpha");
        assertThat(searchQueries(filter("category_name", List.of("Movies"), "checkboxes"))).containsExactly("charlie", "alpha");
        assertThat(searchQueries(filter("source", "API", "boolean"))).containsExactly("charlie", "Bravo");
        assertThat(searchQueries(filter("source", "all", "boolean"))).containsExactly("charlie", "Bravo", "alpha");
        assertThat(searchQueries(filter("username", "ALI", "freetext"))).containsExactly("alpha");
        assertThat(searchQueries(filter("ip", "2.2", "freetext"))).containsExactly("Bravo");
        assertThat(searchQueries(filter("user_agent", "sonarr", "freetext"))).containsExactly("Bravo");
        assertThat(searchQueries(filter("time", Map.of("after", uiTime(7)), "time"))).containsExactly("charlie", "Bravo");
        assertThat(searchQueries(filter("time", Map.of("before", uiTime(7)), "time"))).containsExactly("alpha");
        assertThat(searchQueries(filter("time", Map.of("after", uiTime(7), "before", uiTime(2)), "time"))).containsExactly("Bravo");
    }

    @Test
    void shouldSortSearchesByEveryAllowedColumn() {
        assertThat(searchQueries(sort("time", 1))).containsExactly("alpha", "Bravo", "charlie");
        assertThat(searchQueries(sort("time", 2))).containsExactly("charlie", "Bravo", "alpha");
        assertThat(searchQueries(sort("query", 1))).containsExactly("alpha", "Bravo", "charlie");
        assertThat(searchQueries(sort("query", 2))).containsExactly("charlie", "Bravo", "alpha");
        assertThat(searchQueries(sort("category_name", 1))).containsExactly("charlie", "alpha", "Bravo");
        assertThat(searchQueries(sort("source", 1))).containsExactly("charlie", "Bravo", "alpha");
        assertThat(searchQueries(sort("username", 2))).containsExactly("Bravo", "alpha", "charlie");
        assertThat(searchQueries(sort("ip", 2))).containsExactly("charlie", "Bravo", "alpha");
        assertThat(searchQueries(sort("user_agent", 1))).containsExactly("alpha", "charlie", "Bravo");
    }

    @Test
    void shouldFilterDownloadsByEveryFilterType() {
        assertThat(downloadTitles(filter("title", "TITLE", "freetext"))).containsExactly("Third.Title", "second.title", "First.Title");
        assertThat(downloadTitles(filter("name", List.of("indexer2"), "checkboxes"))).containsExactly("second.title");
        assertThat(downloadTitles(filter("status", List.of("NZB_ADDED"), "checkboxes"))).containsExactly("Third.Title", "First.Title");
        assertThat(downloadTitles(filter("access_source", "INTERNAL", "boolean"))).containsExactly("First.Title");
        assertThat(downloadTitles(filter("age", Map.of("min", "100"), "numberRange"))).containsExactly("Third.Title", "second.title");
        assertThat(downloadTitles(filter("age", Map.of("max", 2000), "numberRange"))).containsExactly("Third.Title", "First.Title");
        assertThat(downloadTitles(filter("age", Map.of("min", "100", "max", "2000"), "numberRange"))).containsExactly("Third.Title");
        assertThat(downloadTitles(filter("username", "bob", "freetext"))).containsExactly("second.title");
        assertThat(downloadTitles(filter("ip", "10.0.0.2", "freetext"))).containsExactly("second.title");
        assertThat(downloadTitles(filter("user_agent", "agent-1", "freetext"))).containsExactly("First.Title");
        assertThat(downloadTitles(filter("time", Map.of("after", uiTime(7)), "time"))).containsExactly("Third.Title", "second.title");
    }

    @Test
    void shouldSortDownloadsByEveryAllowedColumn() {
        assertThat(downloadTitles(sort("time", 1))).containsExactly("First.Title", "second.title", "Third.Title");
        assertThat(downloadTitles(sort("name", 2))).containsExactly("second.title", "Third.Title", "First.Title");
        assertThat(downloadTitles(sort("title", 1))).containsExactly("First.Title", "second.title", "Third.Title");
        assertThat(downloadTitles(sort("status", 1))).containsExactly("second.title", "Third.Title", "First.Title");
        assertThat(downloadTitles(sort("access_source", 2))).containsExactly("First.Title", "Third.Title", "second.title");
        assertThat(downloadTitles(sort("age", 1))).containsExactly("First.Title", "Third.Title", "second.title");
        assertThat(downloadTitles(sort("age", 2))).containsExactly("second.title", "Third.Title", "First.Title");
        assertThat(downloadTitles(sort("username", 1))).containsExactly("First.Title", "second.title", "Third.Title");
        assertThat(downloadTitles(sort("ip", 2))).containsExactly("Third.Title", "second.title", "First.Title");
    }

    @Test
    void shouldFilterAndSortNotifications() {
        assertThat(notificationTitles(filter("NOTIFICATION_EVENT_TYPE", List.of("AUTH_FAILURE", "INDEXER_DISABLED"), "checkboxes"))).containsExactly("t2", "t1");
        assertThat(notificationTitles(filter("MESSAGE_TYPE", List.of("INFO"), "checkboxes"))).containsExactly("t3");
        assertThat(notificationTitles(filter("time", Map.of("before", uiTime(2)), "time"))).containsExactly("t2", "t1");
        assertThat(notificationTitles(sort("NOTIFICATION_EVENT_TYPE", 1))).containsExactly("t2", "t1", "t3");
        assertThat(notificationTitles(sort("time", 1))).containsExactly("t1", "t2", "t3");
    }

    @Test
    void shouldAcceptBoundsAtTheEdgeOfTheAllowedRanges() {
        assertThat(downloadTitles(filter("age", Map.of("max", String.valueOf(Long.MAX_VALUE)), "numberRange"))).hasSize(3);
        assertThat(downloadTitles(filter("age", Map.of("min", "-1.0000000001"), "numberRange"))).hasSize(3);
        assertThat(searchQueries(filter("time", Map.of("before", "9999-12-31T23:59:59.999Z", "after", "0001-01-01T00:00:00.000Z"), "time"))).hasSize(3);
    }

    @Test
    void shouldRejectFiltersH2CouldNotEvaluate() {
        List<HistoryRequest> attempts = List.of(
                filter("time", List.of("abc"), "checkboxes"),
                filter("age", "abc", "boolean"),
                filter("age", Map.of("min", "1e999999999"), "numberRange"),
                filter("time", Map.of("after", "+10000-01-01T00:00:00.000Z"), "time"));
        for (HistoryRequest attempt : attempts) {
            assertThatThrownBy(() -> history.getHistory(attempt, History.DOWNLOAD_TABLE, FileDownloadEntity.class))
                    .isInstanceOf(InvalidHistoryRequestException.class);
        }
    }

    @Test
    void shouldPage() {
        HistoryRequest request = sort("time", 2);
        request.setLimit(2);
        request.setPage(2);

        Page<SearchEntity> page = history.getHistory(request, History.SEARCH_TABLE, SearchEntity.class);

        assertThat(page.getContent()).extracting(SearchEntity::getQuery).containsExactly("alpha");
        assertThat(page.getTotalElements()).isEqualTo(3);
    }

    @Test
    void shouldRejectInjectionAttemptsAndLeaveDataIntact() {
        List<HistoryRequest> attempts = List.of(
                filter("query) LIKE '%' OR (1=1", "x", "freetext"),
                filter("1=1; DELETE FROM SEARCH; --", "x", "freetext"),
                filter("time", Map.of("after", "2020-01-01T00:00:00.000Z', 'yyyy') OR (1=1"), "time"),
                sort("query; DELETE FROM SEARCH", 1),
                sort("CASEWHEN((SELECT COUNT(*) FROM SEARCH) > 0, query, ip)", 1)
        );
        for (HistoryRequest attempt : attempts) {
            assertThatThrownBy(() -> history.getHistory(attempt, History.SEARCH_TABLE, SearchEntity.class))
                    .isInstanceOf(InvalidHistoryRequestException.class);
        }
        HistoryRequest numberAttempt = filter("age", Map.of("min", "0; DELETE FROM INDEXERNZBDOWNLOAD"), "numberRange");
        assertThatThrownBy(() -> history.getHistory(numberAttempt, History.DOWNLOAD_TABLE, FileDownloadEntity.class))
                .isInstanceOf(InvalidHistoryRequestException.class)
                .hasMessageContaining("not a number");
        assertThat(searchRepository.count()).isEqualTo(3);
        assertThat(downloadRepository.count()).isEqualTo(3);
    }

    private List<String> searchQueries(HistoryRequest request) {
        return contentOf(history.getHistory(request, History.SEARCH_TABLE, SearchEntity.class), SearchEntity::getQuery);
    }

    private List<String> downloadTitles(HistoryRequest request) {
        return contentOf(history.getHistory(request, History.DOWNLOAD_TABLE, FileDownloadEntity.class), x -> x.getSearchResult().getTitle());
    }

    private List<String> notificationTitles(HistoryRequest request) {
        return contentOf(history.getHistory(request, History.NOTIFICATION_TABLE, NotificationEntity.class), NotificationEntity::getTitle);
    }

    private static <T> List<String> contentOf(Page<T> page, Function<T, String> mapper) {
        return page.getContent().stream().map(mapper).toList();
    }

    private static HistoryRequest filter(String column, Object value, String type) {
        HistoryRequest request = sort("time", 2);
        request.getFilterModel().put(column, new FilterDefinition(value, type, null));
        return request;
    }

    private static HistoryRequest sort(String column, int sortMode) {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel(column, sortMode));
        return request;
    }

    /**
     * Times are stored as local date-times and the UI's bound is read as one, so the bound is the local wall clock
     * time formatted the way the UI sends it.
     */
    private static String uiTime(int daysAgo) {
        return UI_TIME_FORMAT.format(LocalDateTime.now().minusDays(daysAgo));
    }

    private static Instant daysAgo(int days) {
        return Instant.now().minus(days, ChronoUnit.DAYS);
    }

    private static SearchEntity search(String query, String category, SearchSource source, String username, String ip, String userAgent, int daysAgo) {
        SearchEntity search = new SearchEntity();
        search.setQuery(query);
        search.setCategoryName(category);
        search.setSource(source);
        search.setUsername(username);
        search.setIp(ip);
        search.setUserAgent(userAgent);
        search.setTime(daysAgo(daysAgo));
        return search;
    }

    private static SearchResultEntity searchResult(IndexerEntity indexer, String title) {
        SearchResultEntity searchResult = new SearchResultEntity();
        searchResult.setIndexer(indexer);
        searchResult.setTitle(title);
        searchResult.setIndexerGuid(title);
        return searchResult;
    }

    private static FileDownloadEntity download(SearchResultEntity searchResult, FileDownloadStatus status, SearchSource accessSource, int age, String username, int daysAgo) {
        FileDownloadEntity download = new FileDownloadEntity();
        download.setSearchResult(searchResult);
        download.setStatus(status);
        download.setAccessSource(accessSource);
        download.setAge(age);
        download.setUsername(username);
        download.setIp("10.0.0." + (daysAgo == 10 ? 1 : daysAgo == 5 ? 2 : 3));
        download.setUserAgent("agent-" + (daysAgo == 10 ? 1 : daysAgo == 5 ? 2 : 3));
        download.setTime(daysAgo(daysAgo));
        return download;
    }
}
