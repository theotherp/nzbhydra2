package org.nzbhydra.searching;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerQueriesStartedEvent;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchMessageEvent;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
class SearcherTest {

    /**
     * Safety net so that a broken circuit breaker fails the test instead of hanging the build forever.
     */
    private static final int EMERGENCY_STOP_AFTER_CALLS = 300;

    @Mock
    private DuplicateDetector duplicateDetector;
    @Mock
    private IndexerForSearchSelector indexerSelector;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private SearchPersister searchPersister;
    @Mock
    private Indexer indexer;

    @InjectMocks
    private Searcher testee;

    private static final int DEFAULT_MAX_RESULTS_LOAD_ALL = Searcher.maxResultsLoadAll;

    @BeforeEach
    void setUp() {
        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
        when(searchPersister.createSearchEntity(any(), any())).thenReturn(new SearchEntity());
        when(indexer.getName()).thenReturn("indexerName");
        when(indexerSelector.pickIndexers(any())).thenReturn(new IndexerForSearchSelection(Collections.emptyMap(), List.of(indexer)));
    }

    @AfterEach
    void restoreMaxResultsLoadAll() {
        Searcher.maxResultsLoadAll = DEFAULT_MAX_RESULTS_LOAD_ALL;
    }

    @Test
    @Timeout(value = 120, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void shouldStopLoadAllSearchWhenIndexerKeepsReturningNoResults() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        when(indexer.search(any(), anyInt(), any())).thenAnswer(invocation -> {
            if (calls.incrementAndGet() > EMERGENCY_STOP_AFTER_CALLS) {
                //Without this the searcher would loop forever before the fix
                throw new IllegalStateException("Emergency stop after " + EMERGENCY_STOP_AFTER_CALLS + " calls");
            }
            IndexerSearchResult indexerSearchResult = new IndexerSearchResult(indexer, true);
            indexerSearchResult.setSearchResultItems(Collections.emptyList());
            indexerSearchResult.setTotalResults(1000);
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setHasMoreResults(true);
            indexerSearchResult.setOffset(invocation.getArgument(1));
            indexerSearchResult.setPageSize(0);
            return indexerSearchResult;
        });
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        searchRequest.setLoadAll(true);

        SearchResult searchResult = testee.search(searchRequest);

        assertThat(searchResult.getSearchResultItems()).isEmpty();
        verify(indexer, atMost(5)).search(any(), anyInt(), any());
    }

    @Test
    @Timeout(value = 120, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void shouldKeepQueryingWhileIndexerReturnsNewResultsForLoadAll() throws Exception {
        when(indexer.search(any(), anyInt(), any())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            IndexerSearchResult indexerSearchResult = new IndexerSearchResult(indexer, true);
            indexerSearchResult.setSearchResultItems(List.of(searchResultItem("title" + offset)));
            indexerSearchResult.setTotalResults(3);
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setHasMoreResults(offset < 2);
            indexerSearchResult.setOffset(offset);
            indexerSearchResult.setPageSize(1);
            return indexerSearchResult;
        });
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        searchRequest.setLoadAll(true);

        SearchResult searchResult = testee.search(searchRequest);

        assertThat(searchResult.getSearchResultItems()).hasSize(3);
        verify(indexer, atMost(4)).search(any(), anyInt(), any());
    }

    @Test
    @Timeout(value = 120, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void shouldPublishIndexerQueriesStartedEventForEveryRoundOfQueries() throws Exception {
        when(indexer.search(any(), anyInt(), any())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            IndexerSearchResult indexerSearchResult = new IndexerSearchResult(indexer, true);
            indexerSearchResult.setSearchResultItems(List.of(searchResultItem("title" + offset)));
            indexerSearchResult.setTotalResults(3);
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setHasMoreResults(offset < 2);
            indexerSearchResult.setOffset(offset);
            indexerSearchResult.setPageSize(1);
            return indexerSearchResult;
        });
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 3);
        searchRequest.setQuery("query");

        SearchResult searchResult = testee.search(searchRequest);

        assertThat(searchResult.getSearchResultItems()).hasSize(3);
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(captor.capture());
        List<IndexerQueriesStartedEvent> queriesStartedEvents = captor.getAllValues().stream()
            .filter(IndexerQueriesStartedEvent.class::isInstance)
            .map(IndexerQueriesStartedEvent.class::cast)
            .collect(java.util.stream.Collectors.toList());
        assertThat(queriesStartedEvents).hasSize(3);
        assertThat(queriesStartedEvents).allSatisfy(event -> assertThat(event.getNumberOfQueries()).isEqualTo(1));
    }

    @Test
    void shouldScaleMaxResultsLoadAllWithHeap() {
        long mb = 1024 * 1024;
        assertThat(Searcher.maxResultsLoadAllForHeap(256 * mb)).isEqualTo(10_240);
        assertThat(Searcher.maxResultsLoadAllForHeap(1024 * mb)).isEqualTo(40_960);
        assertThat(Searcher.maxResultsLoadAllForHeap(10 * mb)).isEqualTo(1000);
    }

    /**
     * Reproduces the "Load all" 112k-result scenario from the bug report: a load-all search is paging through many
     * rounds of results when the client aborts it (e.g. by starting a new search). {@code shortcutSearch} must stop
     * the loop promptly - after the round of indexer calls that is in flight when it's called - instead of paging
     * until the load-all cap or the server runs out of memory.
     */
    @Test
    @Timeout(value = 120, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void shouldStopLoadAllSearchPromptlyWhenShortcutIsRequested() throws Exception {
        CountDownLatch firstRoundCalled = new CountDownLatch(1);
        CountDownLatch releaseFirstRound = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        when(indexer.search(any(), anyInt(), any())).thenAnswer(invocation -> {
            int call = calls.incrementAndGet();
            if (call == 1) {
                firstRoundCalled.countDown();
                //Blocks until the shortcut has been requested, so the round in flight when it arrives is the only one
                if (!releaseFirstRound.await(30, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Shortcut was never requested");
                }
            } else if (call > EMERGENCY_STOP_AFTER_CALLS) {
                //Without a prompt shortcut the searcher would keep paging almost indefinitely
                throw new IllegalStateException("Emergency stop after " + EMERGENCY_STOP_AFTER_CALLS + " calls");
            }
            int offset = invocation.getArgument(1);
            IndexerSearchResult indexerSearchResult = new IndexerSearchResult(indexer, true);
            indexerSearchResult.setSearchResultItems(List.of(searchResultItem("title" + offset)));
            indexerSearchResult.setTotalResults(1_000_000);
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setHasMoreResults(true);
            indexerSearchResult.setOffset(offset);
            indexerSearchResult.setPageSize(1);
            return indexerSearchResult;
        });
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        searchRequest.setLoadAll(true);
        searchRequest.setSearchRequestId(555L);

        Thread searchThread = new Thread(() -> testee.search(searchRequest), "load-all-search-under-test");
        searchThread.start();
        try {
            assertThat(firstRoundCalled.await(10, TimeUnit.SECONDS)).isTrue();

            testee.shortcutSearch(555L);
            releaseFirstRound.countDown();

            searchThread.join(10_000);
            assertThat(searchThread.isAlive()).as("load-all search thread finished promptly").isFalse();
            //Only the round already in flight when the shortcut arrived was ever queried
            assertThat(calls.get()).isEqualTo(1);
        } finally {
            releaseFirstRound.countDown();
            searchThread.join(5_000);
        }
    }

    @Test
    @Timeout(value = 120, unit = TimeUnit.SECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    void shouldStopLoadAllOnceMaxResultsCapIsReached() throws Exception {
        Searcher.maxResultsLoadAll = 5;
        when(indexer.search(any(), anyInt(), any())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            IndexerSearchResult indexerSearchResult = new IndexerSearchResult(indexer, true);
            indexerSearchResult.setSearchResultItems(List.of(searchResultItem("title" + offset), searchResultItem("title" + (offset + 1))));
            indexerSearchResult.setTotalResults(Integer.MAX_VALUE);
            indexerSearchResult.setTotalResultsKnown(true);
            indexerSearchResult.setHasMoreResults(true);
            indexerSearchResult.setOffset(offset);
            indexerSearchResult.setPageSize(2);
            return indexerSearchResult;
        });
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        searchRequest.setLoadAll(true);

        SearchResult searchResult = testee.search(searchRequest);

        //Two results per page: the check before the fourth round sees 6 >= 5
        assertThat(searchResult.getSearchResultItems()).hasSize(6);
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(captor.capture());
        assertThat(captor.getAllValues()).anyMatch(SearchMessageEvent.class::isInstance);
    }

    private SearchResultItem searchResultItem(String title) {
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexer);
        item.setTitle(title);
        item.setIndexerGuid(title);
        item.setPubDate(Instant.now());
        return item;
    }
}
