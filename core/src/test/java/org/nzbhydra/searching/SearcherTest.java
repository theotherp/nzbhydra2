package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
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
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    @BeforeEach
    void setUp() {
        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
        when(searchPersister.createSearchEntity(any(), any())).thenReturn(new SearchEntity());
        when(indexer.getName()).thenReturn("indexerName");
        when(indexerSelector.pickIndexers(any())).thenReturn(new IndexerForSearchSelection(Collections.emptyMap(), List.of(indexer)));
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

    private SearchResultItem searchResultItem(String title) {
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexer);
        item.setTitle(title);
        item.setIndexerGuid(title);
        item.setPubDate(Instant.now());
        return item;
    }
}
