package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Lists;
import com.google.common.collect.Multiset;
import com.google.common.collect.Sets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.DuplicateDetectionResult;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

//@ExtendWith(SpringExtension.class)
//@ContextConfiguration(classes = {Searcher.class, DuplicateDetector.class})
public class SearcherUnitTest {

    @InjectMocks
    private Searcher searcher = new Searcher();

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
    @Mock
    private IndexerEntity indexerEntity;
    @Mock
    private SearchResultRepository searchResultRepositoryMock;
    @Mock
    private SearchResultEntity searchResultEntityMock;
    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private IndexerForSearchSelector indexerPicker;
    @Mock
    private IndexerSearchRepository indexerSearchRepository;
    @Mock
    private SearchRequest searchRequestMock;
    @Mock
    private IndexerConfig indexerConfigMock;
    @Captor
    private ArgumentCaptor<List<SearchResultItem>> searchResultItemsCaptor;
    @Mock
    private IndexerForSearchSelection pickingResultMock;
    @Mock
    private IndexerSearchEntity indexerSearchEntityMock;
    @Mock
    private ApplicationEventPublisher applicationEventPublisherMock;
    @Mock
    private ConfigProvider configProviderMock;
    private Random random = new Random();


    @BeforeEach
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(searchResultEntityMock.getIndexer()).thenReturn(indexerEntity);
        searcher.duplicateDetector = duplicateDetector;

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
        when(duplicateDetector.detectDuplicates(any())).thenAnswer(new Answer<DuplicateDetectionResult>() {
            @Override
            public DuplicateDetectionResult answer(InvocationOnMock invocation) throws Throwable {
                Set<SearchResultItem> items = invocation.getArgument(0);
                List<LinkedHashSet<SearchResultItem>> sets = items.stream().map(x -> {
                    return Sets.newLinkedHashSet(Arrays.asList(x));
                }).collect(Collectors.toList());

                return new DuplicateDetectionResult(sets, HashMultiset.create(), 0);
            }
        });

        BaseConfig value = new BaseConfig();
        value.getSearching().setLoadAllCachedOnInternal(false);
        when(configProviderMock.getBaseConfig()).thenReturn(value);
    }


    @Disabled //TODO FIX
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

    @Disabled //TODO FIX
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

    @Disabled //TODO FIX
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

        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(result1b, result1b);

        IndexerSearchResult result2a = mockIndexerSearchResult(0, 100, true, 200, indexer2);
        setResultsPerDay(0, result2a);
        IndexerSearchResult result2b = mockIndexerSearchResult(100, 100, false, 200, indexer2);
        setResultsPerDay(100, result2b);

        when(indexer2.search(any(), anyInt(), anyInt())).thenReturn(result1b, result1b);

        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> foundResults = result.getSearchResultItems();

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 100, 100);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        result = searcher.search(searchRequest);
        foundResults = result.getSearchResultItems();

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


}
