package org.nzbhydra.searching;

import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.SearchRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.searching.searchmodules.AbstractIndexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

//@RunWith(SpringRunner.class)
//@ContextConfiguration(classes = {Searcher.class, DuplicateDetector.class})
public class SearcherUnitTest {

    @InjectMocks
    private Searcher searcher = new Searcher();

    @Mock
    private SearchModuleProvider searchModuleProviderMock;

    @Mock
    private DuplicateDetector duplicateDetector;

    @Mock
    private AbstractIndexer newznabMock1;

    @Mock
    private AbstractIndexer newznabMock2;

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

    @Captor
    private ArgumentCaptor<List<SearchResultItem>> searchResultItemsCaptor;


    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(searchResultEntityMock.getIndexer()).thenReturn(indexerEntity);
        searcher.duplicateDetector = duplicateDetector;
    }


    @Test
    public void shouldTransformToRssXml() throws Exception {
        SearchResultItem searchResultItem1 = new SearchResultItem();
        searchResultItem1.setTitle("searchResultItem1Title");
        searchResultItem1.setIndexerScore(0);
        searchResultItem1.setPubDate(Instant.ofEpochMilli(0));
        when(searchResultMock1.getSearchResultItems()).thenReturn(Arrays.asList(searchResultItem1));
        when(searchResultMock1.isWasSuccessful()).thenReturn(true);
        when(searchResultMock1.getIndexer()).thenReturn(newznabMock1);
        when(searchResultMock1.isHasMoreResults()).thenReturn(false);

        SearchResultItem searchResultItem2 = new SearchResultItem();
        searchResultItem2.setTitle("searchResultItem2Title");
        searchResultItem2.setIndexerScore(0);
        searchResultItem2.setPubDate(Instant.ofEpochMilli(1000));
        when(searchResultMock2.getSearchResultItems()).thenReturn(Arrays.asList(searchResultItem2));
        when(searchResultMock2.isWasSuccessful()).thenReturn(true);
        when(searchResultMock2.getIndexer()).thenReturn(newznabMock2);
        when(searchResultMock2.isHasMoreResults()).thenReturn(false);

        when(newznabMock1.search(any(), eq(0), eq(0))).thenReturn(searchResultMock1);
        when(newznabMock2.search(any(), eq(0), eq(0))).thenReturn(searchResultMock2);


        when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(newznabMock1, newznabMock2));

        SearchResult searchResult = searcher.search(new SearchRequest());
        verify(duplicateDetector).detectDuplicates(searchResultItemsCaptor.capture());

        assertThat(searchResultItemsCaptor.getValue().size(), is(2));

    }

}