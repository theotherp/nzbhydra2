package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import com.google.common.collect.Sets;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerSearchEntity;
import org.nzbhydra.database.IndexerSearchRepository;
import org.nzbhydra.database.SearchRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

//@RunWith(SpringRunner.class)
//@ContextConfiguration(classes = {Searcher.class, DuplicateDetector.class})
@Ignore //TODO Rewrite
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


    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(searchResultEntityMock.getIndexer()).thenReturn(indexerEntity);
        searcher.duplicateDetector = duplicateDetector;

        when(indexer1.getName()).thenReturn("indexer1");
        when(indexer2.getName()).thenReturn("indexer2");
        when(indexer1.getConfig()).thenReturn(indexerConfigMock);
        when(indexer2.getConfig()).thenReturn(indexerConfigMock);
        when(indexer1.getIndexerEntity()).thenReturn(indexerEntity);
        Category category = new Category();
        category.setName("cat");
        when(searchRequestMock.getCategory()).thenReturn(category);
        when(searchRequestMock.getInternalData()).thenReturn(new InternalData());
        when(indexerPicker.pickIndexers(any())).thenReturn(pickingResultMock);
        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1, indexer2));
        when(indexerSearchRepository.findByIndexerEntityAndSearchEntity(any(), any())).thenReturn(indexerSearchEntityMock);

        when(pickingResultMock.getSelectedIndexers()).thenReturn(Arrays.asList(indexer1));
        when(duplicateDetector.detectDuplicates(any())).thenAnswer(new Answer<DuplicateDetectionResult>() {
            @Override
            public DuplicateDetectionResult answer(InvocationOnMock invocation) throws Throwable {
                List<SearchResultItem> items = invocation.getArgument(0);
                List<TreeSet<SearchResultItem>> sets = items.stream().map(x -> {
                    return Sets.newTreeSet(Arrays.asList(x));
                }).collect(Collectors.toList());

                return new DuplicateDetectionResult(sets, HashMultiset.create());
            }
        });
    }


    @Test
    public void shouldFollowOffsetAndLimit() throws Exception {
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(mockIndexerSearchResult(0, 2, true, 200, indexer1));

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 1);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> foundResults = result.getSearchResultItems();
        assertThat(foundResults.size(), is(1));
        assertThat(foundResults.get(0).getTitle(), is("item0"));


        searchRequest.setOffset(1);
        result = searcher.search(searchRequest);
        foundResults = result.getSearchResultItems();
        assertThat(foundResults.size(), is(1));
        assertThat(foundResults.get(0).getTitle(), is("item1"));

        verify(indexer1).search(any(), eq(0), any());
        verify(indexer1, times(1)).search(any(), anyInt(), any());
    }

    @Test
    public void shouldWorkWithRejectedItems() throws Exception {
        IndexerSearchResult result1 = mockIndexerSearchResult(0, 9, true, 20, indexer1);
        Multiset<String> reasons = HashMultiset.create();
        reasons.add("foobar");
        result1.setReasonsForRejection(reasons);
        result1.setLimit(10);
        when(indexer1.search(any(), anyInt(), anyInt())).thenReturn(result1, mockIndexerSearchResult(11, 10, false, 20, indexer1));

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 10);
        searchRequest.setTitle("some title so it will be found in the search request cache");
        SearchResult result = searcher.search(searchRequest);
        List<SearchResultItem> foundResults = result.getSearchResultItems();
        assertThat(foundResults.size(), is(10));

        searchRequest.setOffset(10);
        searchRequest.setLimit(100);
        result = searcher.search(searchRequest);
        foundResults = result.getSearchResultItems();
        assertThat(foundResults.size(), is(9));

        verify(indexer1).search(any(), eq(0), any());
        verify(indexer1, times(2)).search(any(), anyInt(), any());
    }

    private IndexerSearchResult mockIndexerSearchResult(int offset, int limit, boolean hasMoreResults, int totalAvailableResults, Indexer indexer) {

        List<SearchResultItem> items = new ArrayList<>();
        for (int i = offset; i < offset + limit; i++) {
            SearchResultItem item = new SearchResultItem();
            item.setTitle("item" + i);
            items.add(item);
        }

        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();
        indexerSearchResult.setSearchResultItems(items);
        indexerSearchResult.setLimit(limit);
        indexerSearchResult.setOffset(offset);
        indexerSearchResult.setWasSuccessful(true);
        indexerSearchResult.setHasMoreResults(hasMoreResults);
        indexerSearchResult.setTotalResults(totalAvailableResults);
        indexerSearchResult.setTotalResultsKnown(true);
        indexerSearchResult.setIndexer(indexer);

        return indexerSearchResult;
    }


}