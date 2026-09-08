package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Lists;
import com.google.common.collect.Multiset;
import com.google.common.collect.Sets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerSearchResultPersistor;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class SearcherUnitTest {

    private Searcher searcher;
    private SearchPersister searchPersister;

    @Mock
    private SearchModuleProvider searchModuleProviderMock;
    @Mock
    private DuplicateDetector duplicateDetector;
    @Mock
    private Indexer indexer1;
    @Mock
    private Indexer indexer2;
    @Mock
    private IndexerSearchResult searchResultMock1;
    @Mock
    private IndexerSearchResult searchResultMock2;
    @Mock
    private SearchRepository searchRepositoryMock;

    private final IndexerEntity indexerEntity = new IndexerEntity();
    @Mock
    private SearchResultRepository searchResultRepositoryMock;
    private final SearchResultEntity searchResultEntityMock = new SearchResultEntity();
    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private IndexerForSearchSelector indexerPicker;
    @Mock
    private IndexerSearchRepository indexerSearchRepository;
    @Mock
    private IndexerSearchResultPersistor indexerSearchResultPersistor;
    @Mock
    private SearchRequest searchRequestMock;
    @Mock
    private IndexerConfig indexerConfigMock;
    @Captor
    private ArgumentCaptor<List<SearchResultItem>> searchResultItemsCaptor;
    @Mock
    private IndexerForSearchSelection pickingResultMock;
    private final IndexerSearchEntity indexerSearchEntityMock = new IndexerSearchEntity();
    @Mock
    private ApplicationEventPublisher applicationEventPublisherMock;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private TransactionTemplate transactionTemplateMock;
    private final Random random = new Random();


    @BeforeEach
    public void setUp() {

        searchResultEntityMock.setIndexer(indexerEntity);
        searchPersister = new SearchPersister(configProviderMock, transactionTemplateMock, searchRepositoryMock, indexerSearchRepository, searchResultRepositoryMock, indexerSearchResultPersistor);
        searcher = new Searcher(duplicateDetector, indexerPicker, applicationEventPublisherMock, configProviderMock, searchPersister);

        when(indexer1.getName()).thenReturn("indexer1");
        when(indexer1.getConfig()).thenReturn(indexerConfigMock);
        when(indexer1.getIndexerEntity()).thenReturn(indexerEntity);

        when(indexer2.getName()).thenReturn("indexer2");
        when(indexer2.getConfig()).thenReturn(indexerConfigMock);
        Category category = new Category();
        category.setName("cat");
        when(searchRequestMock.getCategory()).thenReturn(category);
        when(searchRequestMock.getInternalData()).thenReturn(new InternalData());
        when(indexerPicker.pickIndexers(any())).thenReturn(pickingResultMock);
        when(indexerSearchRepository.findByIndexerEntityAndSearchEntity(any(), any())).thenReturn(indexerSearchEntityMock);

        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1));
        //By default every item forms its own duplicate group
        doAnswer(invocation -> {
            DuplicateGroups groups = invocation.getArgument(0);
            Collection<SearchResultItem> items = invocation.getArgument(1);
            items.stream().filter(x -> groups.getGroup(x) == null).forEach(groups::createGroup);
            return null;
        }).when(duplicateDetector).addToGroups(any(), any());

        BaseConfig value = new BaseConfig();
        value.getSearching().setLoadAllCachedOnInternal(false);
        when(configProviderMock.getBaseConfig()).thenReturn(value);

        doAnswer(invocation -> {
            invocation.getArgument(0, java.util.function.Consumer.class).accept(null);
            return null;
        }).when(transactionTemplateMock).executeWithoutResult(any());
    }


    @Test
    void shouldFollowOffsetAndLimit() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 2, true, 200, indexer1));

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 1);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> foundResults = result.getSearchResultItems();
        assertThat(foundResults.size()).isEqualTo(1);
        assertThat(foundResults.get(0).getTitle()).isEqualTo("item0");


        searchRequest.setOffset(1);
        result = searcher.search(searchRequest);
        foundResults = result.getSearchResultItems();
        assertThat(foundResults.size()).isEqualTo(1);
        assertThat(foundResults.get(0).getTitle()).isEqualTo("item1");

        verify(indexer1).search(any(), eq(0), any());
        verify(indexer1, times(1)).search(any(), anyInt(), any());
    }

    @Test
    void shouldReturnNewestFirst() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        Instant now = Instant.now();
        IndexerSearchResult indexer1results = mockIndexerSearchResult(0, 100, true, 100, indexer1);
        indexer1results.getSearchResultItems().get(0).setPubDate(now);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexer1results);
        IndexerSearchResult indexer2results = mockIndexerSearchResult(0, 100, true, 100, indexer2);
        indexer2results.getSearchResultItems().get(0).setPubDate(now.minus(1, ChronoUnit.MINUTES));
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(indexer2results);

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 2);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> foundResults = result.getSearchResultItems();
        assertThat(foundResults.size()).isEqualTo(2);
        assertThat(foundResults.get(0).getTitle()).isEqualTo("item0");
        assertThat(foundResults.get(0).getIndexer()).isEqualTo(indexer1);
        assertThat(foundResults.get(1).getTitle()).isEqualTo("item0");
        assertThat(foundResults.get(1).getIndexer()).isEqualTo(indexer2);

    }

    @Test
    void shouldWorkWithRejectedItems() throws Exception {
        IndexerSearchResult result1 = mockIndexerSearchResult(0, 9, true, 20, indexer1);
        Multiset<String> reasons = HashMultiset.create();
        reasons.add("foobar");
        result1.setReasonsForRejection(reasons);
        result1.setPageSize(10);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(result1, mockIndexerSearchResult(11, 10, false, 20, indexer1));

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 10);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> foundResults = result.getSearchResultItems();
        assertThat(foundResults.size()).isEqualTo(10);

        searchRequest.setOffset(10);
        searchRequest.setLimit(100);
        result = searcher.search(searchRequest);
        foundResults = result.getSearchResultItems();
        assertThat(foundResults.size()).isEqualTo(9);

        verify(indexer1).search(any(), eq(0), any());
        verify(indexer1, times(2)).search(any(), anyInt(), any());
    }

    @Test
    void shouldPageCorrectly() throws Exception {

        IndexerSearchResult result1a = mockIndexerSearchResult(0, 100, true, 200, indexer1);
        setResultsPerDay(0, result1a);
        IndexerSearchResult result1b = mockIndexerSearchResult(100, 100, false, 200, indexer1);
        setResultsPerDay(100, result1b);

        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(result1a, result1b);

        IndexerSearchResult result2a = mockIndexerSearchResult(0, 100, true, 200, indexer2);
        setResultsPerDay(0, result2a);
        IndexerSearchResult result2b = mockIndexerSearchResult(100, 100, false, 200, indexer2);
        setResultsPerDay(100, result2b);

        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(result2a, result2b);

        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setTitle("shouldPageCorrectly");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> page1 = result.getSearchResultItems();
        assertThat(page1).hasSize(100);
        assertThat(result.getOffset()).isZero();
        assertThat(result.getLimit()).isEqualTo(100);
        assertNewestFirst(page1);

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 100, 100);
        searchRequest.setTitle("shouldPageCorrectly");
        result = searcher.search(searchRequest);
        List<SearchResultItem> page2 = result.getSearchResultItems();
        assertThat(page2).hasSize(100);
        assertThat(result.getOffset()).isEqualTo(100);
        assertThat(result.getLimit()).isEqualTo(100);
        assertNewestFirst(page2);

        //The two pages must not overlap
        for (SearchResultItem item : page1) {
            assertThat(page2).noneMatch(x -> x == item);
        }
        //And page 2 may not contain anything newer than the oldest entry of page 1
        assertThat(page2.get(0).getBestDate().getEpochSecond()).isLessThanOrEqualTo(page1.get(page1.size() - 1).getBestDate().getEpochSecond());

        verify(indexer1, atMost(2)).search(any(), anyInt(), anyInt());
        verify(indexer2, atMost(2)).search(any(), anyInt(), anyInt());
    }

    /**
     * The searcher sorts by {@link SearchResultItem#getBestDate()}'s epoch <i>second</i>, so only compare seconds.
     */
    private void assertNewestFirst(List<SearchResultItem> items) {
        for (int i = 1; i < items.size(); i++) {
            assertThat(items.get(i).getBestDate().getEpochSecond())
                .as("item %d must not be newer than item %d", i, i - 1)
                .isLessThanOrEqualTo(items.get(i - 1).getBestDate().getEpochSecond());
        }
    }

    private void setResultsPerDay(int offset, IndexerSearchResult result1) {
        int resultsPerDay = 100;
        List<List<SearchResultItem>> partitions = Lists.partition(result1.getSearchResultItems(), resultsPerDay);
        for (int i = 0; i < partitions.size(); i++) {
            List<SearchResultItem> partition = partitions.get(i);
            for (SearchResultItem item : partition) {
                int daysToSubtract = i;
                if (offset > 0) {
                    daysToSubtract += offset / resultsPerDay;
                }

                item.setPubDate(Instant.now().minus(daysToSubtract, ChronoUnit.DAYS));
            }
        }
    }

    private IndexerSearchResult mockIndexerSearchResult(int offset, int limit, boolean hasMoreResults, int totalAvailableResults, Indexer indexer) {

        List<SearchResultItem> items = new ArrayList<>();
        for (int i = offset; i < offset + limit; i++) {
            SearchResultItem item = new SearchResultItem();
            item.setTitle("item" + i);
            item.setPubDate(Instant.now().minus(i, ChronoUnit.DAYS));
            items.add(item);
            item.setIndexer(indexer);
        }

        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setSearchResultItems(items);
        indexerSearchResult.setPageSize(limit);
        indexerSearchResult.setOffset(offset);
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setHasMoreResults(hasMoreResults);
        indexerSearchResult.setTotalResults(totalAvailableResults);
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setIndexer(indexer);

        return indexerSearchResult;
    }

    @Test
    void shouldLoadAllResultsWhenLoadAllIsTrue() throws Exception {
        // Indexer reports 300 total results, returns 100 per page across 3 calls
        when(indexer1.search(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            boolean hasMore = offset < 200; // pages at offset 0 and 100 have more; offset 200 does not
            return mockIndexerSearchResult(offset, 100, hasMore, 300, indexer1);
        });

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setTitle("loadall test");
        searchRequest.setLoadAll(true);

        SearchResult result = searcher.search(searchRequest);

        // All 300 results should be returned, not just the first 100
        assertThat(result.getSearchResultItems()).hasSize(300);
        // Indexer should have been called 3 times (offsets 0, 100, 200)
        verify(indexer1, times(3)).search(any(), anyInt(), anyInt());
    }

    @Test
    void shouldStoreIndexerSearchResponseTime() {
        BaseConfig config = new BaseConfig();
        config.getMain().setKeepHistory(true);
        when(configProviderMock.getBaseConfig()).thenReturn(config);
        when(indexerSearchRepository.save(any(IndexerSearchEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SearchEntity searchEntity = new SearchEntity();
        SearchCacheEntry searchCacheEntry = new SearchCacheEntry(searchRequestMock, pickingResultMock, searchEntity);
        IndexerSearchCacheEntry indexerSearchCacheEntry = new IndexerSearchCacheEntry(indexer1);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setIndexer(indexer1);
        indexerSearchResult.setResponseTime(123L);
        indexerSearchCacheEntry.addIndexerSearchResult(indexerSearchResult);
        searchCacheEntry.getIndexerCacheEntries().put("indexer1", indexerSearchCacheEntry);

        searchPersister.persistNewIndexerSearchResults(searchCacheEntry);

        ArgumentCaptor<IndexerSearchEntity> entityCaptor = ArgumentCaptor.forClass(IndexerSearchEntity.class);
        verify(indexerSearchRepository).save(entityCaptor.capture());
        assertThat(entityCaptor.getValue().getResponseTime()).isEqualTo(123L);
    }

    @Test
    void shouldPersistRecentSearchCriteria() {
        BaseConfig config = new BaseConfig();
        config.getMain().setKeepHistory(true);
        when(configProviderMock.getBaseConfig()).thenReturn(config);
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        Category category = new Category();
        category.setName("cat");
        request.setCategory(category);
        request.setMinage(1);
        request.setMaxage(2);
        request.setMinsize(3);
        request.setMaxsize(4);
        request.setIndexers(Set.of("one", "two"));

        searcher.getSearchCacheEntry(request);

        ArgumentCaptor<SearchEntity> entityCaptor = ArgumentCaptor.forClass(SearchEntity.class);
        verify(searchRepositoryMock).save(entityCaptor.capture());
        assertThat(entityCaptor.getValue().getMinAge()).isEqualTo(1);
        assertThat(entityCaptor.getValue().getMaxAge()).isEqualTo(2);
        assertThat(entityCaptor.getValue().getMinSize()).isEqualTo(3);
        assertThat(entityCaptor.getValue().getMaxSize()).isEqualTo(4);
        assertThat(entityCaptor.getValue().getSelectedIndexers()).containsExactlyInAnyOrder("one", "two");
    }

    @Test
    void shouldStopSearchingIndexerAfterMaxQueries() throws Exception {
        // This test verifies the circuit breaker prevents infinite loops
        // when an indexer always claims to have more results
        int maxQueries = 15; // MAX_QUERIES_UNTIL_BREAK constant value

        // Set up indexer to always return results with hasMoreResults=true
        when(indexer1.search(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            return mockIndexerSearchResult(offset, 100, true, 10000, indexer1);
        });

        // Request many more results than the indexer will return per page
        // This forces the searcher to make multiple calls
        SearchRequest searchRequest = new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 2000);
        searchRequest.setTitle("test query");

        SearchResult result = searcher.search(searchRequest);

        // The circuit breaker stops exactly at MAX_QUERIES_UNTIL_BREAK queries
        verify(indexer1, times(maxQueries)).search(any(), anyInt(), anyInt());
        assertThat(result.getSearchResultItems()).hasSize(maxQueries * 100);
    }

    // ------------------------------------------------------------------------------------------------
    // Helpers for the tests below
    // ------------------------------------------------------------------------------------------------

    private static final Instant BASE = Instant.parse("2024-01-01T00:00:00Z");

    private SearchResultItem item(String title, Indexer indexer, Instant pubDate) {
        SearchResultItem item = new SearchResultItem();
        item.setTitle(title);
        item.setIndexer(indexer);
        item.setPubDate(pubDate);
        return item;
    }

    private IndexerSearchResult indexerSearchResultWith(Indexer indexer, boolean hasMoreResults, int totalResults, List<SearchResultItem> items) {
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setIndexer(indexer);
        indexerSearchResult.setSearchResultItems(new ArrayList<>(items));
        indexerSearchResult.setPageSize(Math.max(items.size(), 1));
        indexerSearchResult.setOffset(0);
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setHasMoreResults(hasMoreResults);
        indexerSearchResult.setTotalResults(totalResults);
        indexerSearchResult.setTotalResultsKnown(true);
        return indexerSearchResult;
    }

    private BaseConfig configWith(boolean keepHistory, boolean loadAllCachedOnInternal) {
        BaseConfig config = new BaseConfig();
        config.getMain().setKeepHistory(keepHistory);
        config.getSearching().setLoadAllCachedOnInternal(loadAllCachedOnInternal);
        when(configProviderMock.getBaseConfig()).thenReturn(config);
        return config;
    }

    private SearchRequest request(SearchSource source, int offset, int limit, String title) {
        SearchRequest searchRequest = new SearchRequest(source, SearchType.SEARCH, offset, limit);
        searchRequest.setTitle(title);
        return searchRequest;
    }

    // ------------------------------------------------------------------------------------------------
    // Search event
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldPublishSearchEventWithTheSearchRequest() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 2, false, 2, indexer1));
        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 10, "shouldPublishSearchEvent");

        searcher.search(searchRequest);

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(applicationEventPublisherMock).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isInstanceOf(Searcher.SearchEvent.class);
        assertThat(((Searcher.SearchEvent) eventCaptor.getValue()).searchRequest()).isSameAs(searchRequest);
    }

    // ------------------------------------------------------------------------------------------------
    // Splicing according to offset and limit
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldReturnEmptyListWhenOffsetExceedsNumberOfAvailableResults() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 5, false, 5, indexer1));

        SearchResult result = searcher.search(request(SearchSource.API, 10, 10, "shouldReturnEmptyListWhenOffsetExceeds"));

        assertThat(result.getSearchResultItems()).isEmpty();
    }

    @Test
    void shouldReturnOnlyRemainingResultsWhenOffsetPlusLimitExceedsAvailableResults() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 5, false, 5, indexer1));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 3, 10, "shouldReturnOnlyRemainingResults"));

        assertThat(result.getSearchResultItems()).hasSize(2);
        assertThat(result.getOffset()).isEqualTo(3);
        assertThat(result.getLimit()).isEqualTo(2);
    }

    @Test
    void shouldReturnAllCachedResultsForInternalSearchesWhenLoadAllCachedOnInternalIsEnabled() throws Exception {
        configWith(true, true);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 50, false, 50, indexer1));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 10, "shouldLoadAllCachedOnInternalTrue"));

        assertThat(result.getSearchResultItems()).hasSize(50);
        assertThat(result.getLimit()).isEqualTo(50);
    }

    @Test
    void shouldReturnOnlyLimitResultsForInternalSearchesWhenLoadAllCachedOnInternalIsDisabled() throws Exception {
        configWith(true, false);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 50, false, 50, indexer1));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 10, "shouldLoadAllCachedOnInternalFalse"));

        assertThat(result.getSearchResultItems()).hasSize(10);
        assertThat(result.getLimit()).isEqualTo(10);
    }

    // ------------------------------------------------------------------------------------------------
    // Duplicate handling
    // ------------------------------------------------------------------------------------------------

    /**
     * Groups all items with the same title, also over multiple calls, so that duplicates found in a later indexer
     * round join the group created in an earlier one.
     */
    private void stubDuplicateDetectorGroupingByTitle() {
        //doAnswer because the default answer set up in setUp() would be executed by a when(...) call
        doAnswer(invocation -> {
            DuplicateGroups groups = invocation.getArgument(0);
            Collection<SearchResultItem> items = invocation.getArgument(1);
            for (SearchResultItem item : items) {
                if (groups.getGroup(item) != null) {
                    continue;
                }
                DuplicateGroups.DuplicateGroup existingGroup = groups.getGroups().stream()
                    .filter(x -> x.getItems().iterator().next().getTitle().equals(item.getTitle()))
                    .findFirst()
                    .orElse(null);
                if (existingGroup == null) {
                    groups.createGroup(item);
                } else {
                    groups.addToGroup(existingGroup, item);
                }
            }
            return null;
        }).when(duplicateDetector).addToGroups(any(), any());
    }

    @Test
    void shouldRemoveDuplicatesForApiSearchesAndKeepTheNewestItem() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        SearchResultItem newer = item("duplicate", indexer1, BASE.plus(10, ChronoUnit.DAYS));
        SearchResultItem older = item("duplicate", indexer2, BASE);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer1, false, 1, List.of(newer)));
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer2, false, 1, List.of(older)));
        stubDuplicateDetectorGroupingByTitle();

        SearchResult result = searcher.search(request(SearchSource.API, 0, 100, "shouldRemoveDuplicatesForApi"));

        assertThat(result.getSearchResultItems()).containsExactly(newer);
        assertThat(result.getNumberOfRemovedDuplicates()).isEqualTo(1);
        assertThat(result.getNumberOfFoundDuplicates()).isEqualTo(1);
    }

    @Test
    void shouldNotRemoveDuplicatesForInternalSearches() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        SearchResultItem newer = item("duplicate", indexer1, BASE.plus(10, ChronoUnit.DAYS));
        SearchResultItem older = item("duplicate", indexer2, BASE);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer1, false, 1, List.of(newer)));
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer2, false, 1, List.of(older)));
        stubDuplicateDetectorGroupingByTitle();

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldNotRemoveDuplicatesForInternal"));

        assertThat(result.getSearchResultItems()).containsExactly(newer, older);
        assertThat(result.getNumberOfRemovedDuplicates()).isZero();
        assertThat(result.getNumberOfFoundDuplicates()).isEqualTo(1);
    }

    @Test
    void shouldKeepTheHighestScoredItemOfADuplicateGroupForApiSearches() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        //The newer item is popped first but the older one of the other indexer has the better score and wins
        SearchResultItem newerButLowerScore = item("duplicate", indexer1, BASE.plus(10, ChronoUnit.DAYS));
        newerButLowerScore.setIndexerScore(1);
        SearchResultItem olderButHigherScore = item("duplicate", indexer2, BASE);
        olderButHigherScore.setIndexerScore(5);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer1, false, 1, List.of(newerButLowerScore)));
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer2, false, 1, List.of(olderButHigherScore)));
        stubDuplicateDetectorGroupingByTitle();

        SearchResult result = searcher.search(request(SearchSource.API, 0, 100, "shouldKeepHighestScoredDuplicate"));

        assertThat(result.getSearchResultItems()).containsExactly(olderButHigherScore);
        assertThat(result.getNumberOfRemovedDuplicates()).isEqualTo(1);
        assertThat(result.getNumberOfFoundDuplicates()).isEqualTo(1);
    }

    @Test
    void shouldNotRemoveAnAlreadyReturnedItemWhenADuplicateArrivesInALaterIndexerRound() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        SearchResultItem returnedOnFirstPage = item("duplicate", indexer1, BASE.plus(10, ChronoUnit.DAYS));
        returnedOnFirstPage.setIndexerScore(1);
        SearchResultItem second = item("second", indexer1, BASE.plus(5, ChronoUnit.DAYS));
        //Arrives only in the second round and would have won if it had been known earlier
        SearchResultItem lateDuplicate = item("duplicate", indexer2, BASE);
        lateDuplicate.setIndexerScore(9);

        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResultWith(indexer1, false, 2, List.of(returnedOnFirstPage, second)));
        IndexerSearchResult emptyFirstPage = indexerSearchResultWith(indexer2, true, 1, List.of());
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(emptyFirstPage, indexerSearchResultWith(indexer2, false, 1, List.of(lateDuplicate)));
        stubDuplicateDetectorGroupingByTitle();

        SearchRequest firstPageRequest = request(SearchSource.API, 0, 2, "shouldNotRemoveAlreadyReturnedItems");
        SearchResult firstPage = searcher.search(firstPageRequest);
        assertThat(firstPage.getSearchResultItems()).containsExactly(returnedOnFirstPage, second);

        SearchRequest secondPageRequest = request(SearchSource.API, 2, 2, "shouldNotRemoveAlreadyReturnedItems");
        SearchResult secondPage = searcher.search(secondPageRequest);

        //The late duplicate is dropped instead of replacing the item which was already returned on page 1
        assertThat(secondPage.getSearchResultItems()).isEmpty();
        assertThat(secondPage.getNumberOfRemovedDuplicates()).isEqualTo(1);
        assertThat(secondPage.getNumberOfFoundDuplicates()).isEqualTo(1);
    }

    // ------------------------------------------------------------------------------------------------
    // Reasons for rejection
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldAggregateReasonsForRejectionOverAllIndexersAndPages() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));

        IndexerSearchResult indexer1Page1 = mockIndexerSearchResult(0, 2, true, 4, indexer1);
        indexer1Page1.getReasonsForRejection().add("tooOld");
        IndexerSearchResult indexer1Page2 = mockIndexerSearchResult(2, 2, false, 4, indexer1);
        indexer1Page2.getReasonsForRejection().add("tooOld");
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexer1Page1, indexer1Page2);

        IndexerSearchResult indexer2Page1 = mockIndexerSearchResult(0, 2, false, 2, indexer2);
        indexer2Page1.getReasonsForRejection().add("tooOld");
        indexer2Page1.getReasonsForRejection().add("forbiddenWord");
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(indexer2Page1);

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldAggregateReasonsForRejection"));

        assertThat(result.getReasonsForRejection().count("tooOld")).isEqualTo(3);
        assertThat(result.getReasonsForRejection().count("forbiddenWord")).isEqualTo(1);
        assertThat(result.getNumberOfRejectedResults()).isEqualTo(4);
        verify(indexer1, times(2)).search(any(), anyInt(), anyInt());
    }

    // ------------------------------------------------------------------------------------------------
    // Failed indexers
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldNotQueryFailedIndexerAgainButStillReportItAndReturnResultsOfOtherIndexer() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));

        IndexerSearchResult failed = new IndexerSearchResult();
        failed.setIndexer(indexer1);
        failed.setWasSuccessful(false);
        failed.setHasMoreResults(false);
        failed.setErrorMessage("boom");
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(failed);

        IndexerSearchResult successful = mockIndexerSearchResult(0, 3, false, 3, indexer2);
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(successful);

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldNotQueryFailedIndexerAgain"));

        verify(indexer1, times(1)).search(any(), anyInt(), anyInt());
        assertThat(result.getIndexerSearchResults()).anyMatch(x -> x == failed);
        assertThat(result.getSearchResultItems()).hasSize(3);
        assertThat(result.getSearchResultItems()).allMatch(x -> x.getIndexer() == indexer2);
    }

    // ------------------------------------------------------------------------------------------------
    // Paging inside the indexer
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldPageInsideIndexerUntilEnoughResultsAreAvailable() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            return mockIndexerSearchResult(offset, 100, true, 1000, indexer1);
        });

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 150, "shouldPageInsideIndexer"));

        verify(indexer1).search(any(), eq(0), anyInt());
        verify(indexer1).search(any(), eq(100), anyInt());
        verify(indexer1, times(2)).search(any(), anyInt(), anyInt());
        assertThat(result.getSearchResultItems()).hasSize(150);
    }

    // ------------------------------------------------------------------------------------------------
    // Cache paging
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldServeSecondPageFromCacheAndStartNewSearchWhenOffsetIsZeroAgain() throws Exception {
        configWith(true, false);
        IndexerSearchResult indexerSearchResult = mockIndexerSearchResult(0, 2, false, 2, indexer1);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexerSearchResult);

        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 1, "shouldServeSecondPageFromCache");
        SearchResult firstPage = searcher.search(searchRequest);
        assertThat(firstPage.getSearchResultItems()).hasSize(1);
        assertThat(firstPage.getSearchResultItems().get(0).getTitle()).isEqualTo("item0");

        searchRequest.setOffset(1);
        SearchResult secondPage = searcher.search(searchRequest);
        assertThat(secondPage.getSearchResultItems()).hasSize(1);
        assertThat(secondPage.getSearchResultItems().get(0).getTitle()).isEqualTo("item1");
        verify(indexer1, times(1)).search(any(), anyInt(), anyInt());
        verify(searchRepositoryMock, times(1)).save(any(SearchEntity.class));

        //Offset 0 means a brand new search, so the indexer is queried again and a new search entity is persisted
        searchRequest.setOffset(0);
        searcher.search(searchRequest);
        verify(indexer1, times(2)).search(any(), anyInt(), anyInt());
        verify(searchRepositoryMock, times(2)).save(any(SearchEntity.class));
    }

    // ------------------------------------------------------------------------------------------------
    // getSearchCacheEntry reuse
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldReuseCacheEntryForNonZeroOffsetAndUpdateItsSearchRequest() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 5, false, 5, indexer1));
        searcher.search(request(SearchSource.INTERNAL, 0, 2, "shouldReuseCacheEntry"));

        SearchRequest secondRequest = request(SearchSource.INTERNAL, 2, 2, "shouldReuseCacheEntry");
        SearchCacheEntry secondEntry = searcher.getSearchCacheEntry(secondRequest);
        assertThat(secondEntry.getSearchRequest()).isSameAs(secondRequest);

        SearchRequest thirdRequest = request(SearchSource.INTERNAL, 4, 2, "shouldReuseCacheEntry");
        SearchCacheEntry thirdEntry = searcher.getSearchCacheEntry(thirdRequest);
        assertThat(thirdEntry).isSameAs(secondEntry);
        assertThat(thirdEntry.getSearchRequest()).isSameAs(thirdRequest);
    }

    // ------------------------------------------------------------------------------------------------
    // Persistence
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldNotPersistHistoryWhenKeepHistoryIsFalseButStillSaveSearchResultEntities() throws Exception {
        configWith(false, false);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 3, false, 3, indexer1));

        searcher.search(request(SearchSource.INTERNAL, 0, 10, "shouldNotPersistHistory"));

        verify(searchRepositoryMock, never()).save(any(SearchEntity.class));
        verify(indexerSearchRepository, never()).save(any(IndexerSearchEntity.class));
        verify(indexerSearchResultPersistor, never()).persistSearchResultOccurrences(any(), any());
        //Documents current behaviour: search result entities are saved regardless of the keepHistory setting
        verify(searchResultRepositoryMock, atLeastOnce()).saveAll(any());
    }

    @Test
    void shouldCreateOneIndexerSearchEntityPerIndexerAndFillItFromTheFirstIndexerSearchResult() {
        configWith(true, false);
        when(indexerSearchRepository.save(any(IndexerSearchEntity.class))).thenAnswer(invocation -> {
            IndexerSearchEntity entity = invocation.getArgument(0);
            entity.setId(42);
            return entity;
        });

        SearchEntity searchEntity = new SearchEntity();
        SearchCacheEntry searchCacheEntry = new SearchCacheEntry(searchRequestMock, pickingResultMock, searchEntity);
        IndexerSearchCacheEntry indexerSearchCacheEntry = new IndexerSearchCacheEntry(indexer1);

        SearchResultEntity searchResultEntity = new SearchResultEntity();
        searchResultEntity.setIndexerSearchEntityId(null);

        IndexerSearchResult firstPage = new IndexerSearchResult();
        firstPage.setIndexer(indexer1);
        firstPage.setWasSuccessful(true);
        firstPage.setTotalResults(123);
        firstPage.setErrorMessage("someError");
        firstPage.setSearchResultEntities(Sets.newHashSet(searchResultEntity));
        IndexerSearchResult secondPage = new IndexerSearchResult();
        secondPage.setIndexer(indexer1);
        secondPage.setWasSuccessful(true);
        secondPage.setTotalResults(999);
        indexerSearchCacheEntry.addIndexerSearchResult(firstPage);
        indexerSearchCacheEntry.addIndexerSearchResult(secondPage);
        searchCacheEntry.getIndexerCacheEntries().put("indexer1", indexerSearchCacheEntry);

        searchPersister.persistNewIndexerSearchResults(searchCacheEntry);

        ArgumentCaptor<IndexerSearchEntity> entityCaptor = ArgumentCaptor.forClass(IndexerSearchEntity.class);
        //Two search results for the same indexer, but the same entity is saved twice instead of creating a second one
        verify(indexerSearchRepository, times(2)).save(entityCaptor.capture());
        IndexerSearchEntity saved = entityCaptor.getAllValues().get(0);
        assertThat(entityCaptor.getAllValues().get(1)).isSameAs(saved);

        assertThat(saved.getResultsCount()).isEqualTo(123);
        assertThat(saved.getSuccessful()).isTrue();
        assertThat(saved.getErrorMessage()).isEqualTo("someError");
        assertThat(saved.getIndexerEntity()).isSameAs(indexerEntity);
        assertThat(saved.getSearchEntity()).isSameAs(searchEntity);

        assertThat(searchResultEntity.getIndexerSearchEntityId()).isEqualTo(42);
        verify(indexerSearchResultPersistor).persistSearchResultOccurrences(saved, firstPage.getSearchResultIds());
        assertThat(indexerSearchCacheEntry.getIndexerSearchEntity()).isSameAs(saved);
    }

    // ------------------------------------------------------------------------------------------------
    // Search entity mapping
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldMapSearchRequestToSearchEntity() {
        configWith(true, false);
        SearchRequest searchRequest = new SearchRequest(SearchSource.API, SearchType.TVSEARCH, 0, 100);
        Category category = new Category();
        category.setName("someCategory");
        searchRequest.setCategory(category);
        searchRequest.setQuery("someQuery");
        Map<MediaIdType, String> identifiers = new HashMap<>();
        identifiers.put(MediaIdType.IMDB, "tt1234");
        identifiers.put(MediaIdType.TMDB, null);
        searchRequest.setIdentifiers(identifiers);
        searchRequest.setSeason(3);
        searchRequest.setEpisode("4");
        searchRequest.setTitle("someTitle");
        searchRequest.setAuthor("someAuthor");

        searcher.getSearchCacheEntry(searchRequest);

        ArgumentCaptor<SearchEntity> entityCaptor = ArgumentCaptor.forClass(SearchEntity.class);
        verify(searchRepositoryMock).save(entityCaptor.capture());
        SearchEntity entity = entityCaptor.getValue();
        assertThat(entity.getSource()).isEqualTo(SearchSource.API);
        assertThat(entity.getCategoryName()).isEqualTo("someCategory");
        assertThat(entity.getQuery()).isEqualTo("someQuery");
        assertThat(entity.getIdentifiers()).hasSize(1);
        assertThat(entity.getIdentifiers().iterator().next().getIdentifierKey()).isEqualTo(MediaIdType.IMDB.name());
        assertThat(entity.getIdentifiers().iterator().next().getIdentifierValue()).isEqualTo("tt1234");
        assertThat(entity.getSeason()).isEqualTo(3);
        assertThat(entity.getEpisode()).isEqualTo("4");
        assertThat(entity.getSearchType()).isEqualTo(SearchType.TVSEARCH);
        assertThat(entity.getTitle()).isEqualTo("someTitle");
        assertThat(entity.getAuthor()).isEqualTo("someAuthor");
    }

    // ------------------------------------------------------------------------------------------------
    // Shortcut and shutdown
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldReturnEmptyResultWithoutCallingIndexersWhenRequestIsAlreadyShortcut() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 5, false, 5, indexer1));
        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 100, "shouldShortcutImmediately");
        searchRequest.setShortcut(true);

        SearchResult result = searcher.search(searchRequest);

        assertThat(result.getSearchResultItems()).isEmpty();
        verify(indexer1, never()).search(any(), anyInt(), anyInt());
    }

    @Test
    void shouldCancelRunningSearchWhenShortcutIsRequested() throws Exception {
        CountDownLatch indexerCalled = new CountDownLatch(1);
        CountDownLatch releaseIndexer = new CountDownLatch(1);
        when(indexer1.search(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            indexerCalled.countDown();
            //Throws InterruptedException when the future is cancelled, which lets the executor shut down
            releaseIndexer.await(30, TimeUnit.SECONDS);
            return mockIndexerSearchResult(0, 100, true, 10000, indexer1);
        });

        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 1000, "shouldCancelRunningSearch");
        searchRequest.setSearchRequestId(123L);

        Thread searchThread = new Thread(() -> searcher.search(searchRequest), "search-under-test");
        searchThread.start();
        try {
            assertThat(indexerCalled.await(10, TimeUnit.SECONDS)).isTrue();

            searcher.shortcutSearch(123L);

            searchThread.join(10_000);
            assertThat(searchThread.isAlive()).as("search thread finished").isFalse();
            assertThat(searchRequest.isShortcut()).isTrue();
        } finally {
            releaseIndexer.countDown();
            searchThread.join(5_000);
        }
    }

    @Test
    void shouldNotSearchAnymoreAfterShutdown() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 5, false, 5, indexer1));
        searcher.onShutdown();

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldNotSearchAfterShutdown"));

        verify(indexer1, never()).search(any(), anyInt(), anyInt());
        assertThat(result.getSearchResultItems()).isEmpty();
    }

    // ------------------------------------------------------------------------------------------------
    // loadAll ignores the circuit breaker
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldKeepQueryingUntilTheLoadAllMaximumWhenLoadAllIsRequested() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            return mockIndexerSearchResult(offset, 10, offset < 190, 200, indexer1);
        });

        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 10, "shouldIgnoreCircuitBreakerOnLoadAll");
        searchRequest.setLoadAll(true);

        SearchResult result = searcher.search(searchRequest);

        verify(indexer1, times(20)).search(any(), anyInt(), anyInt());
        assertThat(result.getSearchResultItems()).hasSize(200);
    }

    // ------------------------------------------------------------------------------------------------
    // Result metadata, ordering and rejected pages
    // ------------------------------------------------------------------------------------------------

    @Test
    void shouldSetSearchIdOfReturnedItemsToTheSearchEntityId() throws Exception {
        configWith(true, false);
        when(searchRepositoryMock.save(any(SearchEntity.class))).thenAnswer(invocation -> {
            SearchEntity entity = invocation.getArgument(0);
            entity.setId(7);
            return entity;
        });
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 3, false, 3, indexer1));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldSetSearchId"));

        assertThat(result.getSearchResultItems()).isNotEmpty();
        assertThat(result.getSearchResultItems()).allMatch(x -> x.getSearchId() != null && x.getSearchId() == 7);
    }

    @Test
    void shouldCalculateNumberOfTotalAvailableResultsAsSumOfMaxOfReportedAndActualResults() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        //Reports 200, delivers 100 -> 200
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 100, false, 200, indexer1));
        //Reports 5, delivers 10 -> 10
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 10, false, 5, indexer2));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 500, "shouldCalculateTotalAvailable"));

        assertThat(result.getNumberOfTotalAvailableResults()).isEqualTo(210);
    }

    @Test
    void shouldOnlyReportTheLastIndexerSearchResultPerIndexer() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        IndexerSearchResult indexer1Page1 = mockIndexerSearchResult(0, 2, true, 4, indexer1);
        IndexerSearchResult indexer1Page2 = mockIndexerSearchResult(2, 2, false, 4, indexer1);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(indexer1Page1, indexer1Page2);
        IndexerSearchResult indexer2Page1 = mockIndexerSearchResult(0, 2, false, 2, indexer2);
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(indexer2Page1);

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldOnlyReportLastIndexerSearchResult"));

        assertThat(result.getIndexerSearchResults()).hasSize(2);
        assertThat(result.getIndexerSearchResults()).anyMatch(x -> x == indexer1Page2);
        assertThat(result.getIndexerSearchResults()).noneMatch(x -> x == indexer1Page1);
        assertThat(result.getIndexerSearchResults()).anyMatch(x -> x == indexer2Page1);
    }

    @Test
    void shouldSortByBestDateAndNotByPubDate() throws Exception {
        SearchResultItem oldPubDateButRecentUsenetDate = item("recentUsenetDate", indexer1, BASE.minus(100, ChronoUnit.DAYS));
        oldPubDateButRecentUsenetDate.setUsenetDate(BASE.minus(1, ChronoUnit.DAYS));
        SearchResultItem middlingPubDate = item("middlingPubDate", indexer1, BASE.minus(10, ChronoUnit.DAYS));

        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(
            indexerSearchResultWith(indexer1, false, 2, List.of(middlingPubDate, oldPubDateButRecentUsenetDate)));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldSortByBestDate"));

        assertThat(result.getSearchResultItems()).containsExactly(oldPubDateButRecentUsenetDate, middlingPubDate);
    }

    @Test
    void shouldCallIndexerAgainAtNextPageWhenAPageContainedOnlyRejectedResults() throws Exception {
        IndexerSearchResult emptyPage = new IndexerSearchResult();
        emptyPage.setIndexer(indexer1);
        emptyPage.setWasSuccessful(true);
        emptyPage.setHasMoreResults(true);
        emptyPage.setOffset(0);
        emptyPage.setPageSize(100);
        emptyPage.setTotalResults(200);
        emptyPage.getReasonsForRejection().add("tooOld", 100);

        IndexerSearchResult secondPage = mockIndexerSearchResult(100, 5, false, 200, indexer1);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(emptyPage, secondPage);

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldPageAfterOnlyRejectedResults"));

        verify(indexer1).search(any(), eq(0), anyInt());
        verify(indexer1).search(any(), eq(100), anyInt());
        verify(indexer1, times(2)).search(any(), anyInt(), anyInt());
        assertThat(result.getSearchResultItems()).hasSize(5);
        assertThat(result.getReasonsForRejection().count("tooOld")).isEqualTo(100);
    }

    // ------------------------------------------------------------------------------------------------
    // Bug fixes
    // ------------------------------------------------------------------------------------------------

    @Test
    @Timeout(10)
    void shouldReportAFailedResultAndNotHangWhenAnIndexerThrows() throws Exception {
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        when(indexer1.search(any(), anyInt(), anyInt())).thenThrow(new RuntimeException("boom"));
        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 3, false, 3, indexer2));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldHandleThrowingIndexer"));

        verify(indexer1, times(1)).search(any(), anyInt(), anyInt());
        assertThat(result.getIndexerSearchResults())
            .anyMatch(x -> x.getIndexer() == indexer1
                           && !x.isWasSuccessful()
                           && !x.isHasMoreResults()
                           && "Unexpected error. Please check the log.".equals(x.getErrorMessage()));
        assertThat(result.getSearchResultItems()).hasSize(3);
    }

    @Test
    void shouldUseTheSameCacheEntryForBothPagesOfAQueryWithForbiddenWords() throws Exception {
        configWith(true, false);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 2, false, 2, indexer1));

        SearchRequest firstPage = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 1);
        firstPage.setQuery("foo --bar");
        SearchResult firstResult = searcher.search(firstPage);
        assertThat(firstResult.getSearchResultItems()).hasSize(1);

        //A completely new request object for the second page, as it would be created by the web layer
        SearchRequest secondPage = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 1, 1);
        secondPage.setQuery("foo --bar");
        SearchResult secondResult = searcher.search(secondPage);

        assertThat(secondResult.getSearchResultItems()).hasSize(1);
        assertThat(secondResult.getSearchResultItems().get(0).getTitle()).isEqualTo("item1");
        verify(indexer1, times(1)).search(any(), anyInt(), anyInt());

        //The search entity must contain the query as entered by the user
        ArgumentCaptor<SearchEntity> entityCaptor = ArgumentCaptor.forClass(SearchEntity.class);
        verify(searchRepositoryMock, times(1)).save(entityCaptor.capture());
        assertThat(entityCaptor.getValue().getQuery()).isEqualTo("foo --bar");
    }

    @Test
    void shouldIgnoreShortcutForUnknownSearchRequestId() {
        searcher.shortcutSearch(9999L);
    }

    @Test
    @Timeout(10)
    void shouldEndTheSearchWhenAShortcutArrivesBetweenTwoIndexerRounds() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenAnswer(invocation -> {
            int offset = invocation.getArgument(1);
            return mockIndexerSearchResult(offset, 100, true, 10000, indexer1);
        });
        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 1000, "shouldShortcutBetweenRounds");
        searchRequest.setSearchRequestId(4711L);
        //Called after the first round of indexer calls, i.e. exactly between two rounds
        doAnswer(invocation -> {
            searcher.shortcutSearch(4711L);
            DuplicateGroups groups = invocation.getArgument(0);
            Collection<SearchResultItem> items = invocation.getArgument(1);
            items.stream().filter(x -> groups.getGroup(x) == null).forEach(groups::createGroup);
            return null;
        }).when(duplicateDetector).addToGroups(any(), any());

        SearchResult result = searcher.search(searchRequest);

        verify(indexer1, times(1)).search(any(), anyInt(), anyInt());
        assertThat(result.getSearchResultItems()).hasSize(100);
    }

    @Test
    void shouldNotCreateASecondSearchEntityForTheSecondPageWhenNoIndexerWasSelected() throws Exception {
        configWith(true, false);
        when(pickingResultMock.getSelectedIndexers()).thenReturn(List.of());

        SearchRequest searchRequest = request(SearchSource.INTERNAL, 0, 10, "shouldCacheEmptySearch");
        assertThat(searcher.search(searchRequest).getSearchResultItems()).isEmpty();

        searchRequest.setOffset(1);
        assertThat(searcher.search(searchRequest).getSearchResultItems()).isEmpty();

        verify(searchRepositoryMock, times(1)).save(any(SearchEntity.class));
    }

    @Test
    void shouldSortItemsWithoutAnyDateLast() throws Exception {
        SearchResultItem withDate = item("withDate", indexer1, BASE);
        SearchResultItem withoutDate = item("withoutDate", indexer1, null);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(
            indexerSearchResultWith(indexer1, false, 2, List.of(withoutDate, withDate)));

        SearchResult result = searcher.search(request(SearchSource.INTERNAL, 0, 100, "shouldSortDatelessItemsLast"));

        assertThat(result.getSearchResultItems()).containsExactly(withDate, withoutDate);
    }

    @Test
    void shouldSetOffsetAndLimitEvenWhenThePageIsEmpty() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 5, false, 5, indexer1));

        SearchResult result = searcher.search(request(SearchSource.API, 10, 10, "shouldSetOffsetAndLimitOnEmptyPage"));

        assertThat(result.getSearchResultItems()).isEmpty();
        assertThat(result.getOffset()).isEqualTo(10);
        assertThat(result.getLimit()).isEqualTo(10);
    }

}
