package org.nzbhydra.searching.searchmodules;

import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.nzbhydra.database.*;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.CoreMatchers.not;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class AbstractIndexerTest {

    @Mock
    private IndexerEntity indexerEntityMock;
    @Mock
    private AbstractIndexer indexerMock;
    @Mock
    private IndexerStatusEntity statusMock;
    @Mock
    private SearchResultEntity searchResultEntityMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private SearchResultRepository searchResultRepositoryMock;
    @Captor
    private ArgumentCaptor<List<SearchResultEntity>> searchResultEntitiesCaptor;


    @InjectMocks
    private AbstractIndexer testee = new AbstractIndexer() {
        @Override
        protected Logger getLogger() {
            return LoggerFactory.getLogger("test");
        }

        @Override
        public IndexerSearchResult search(SearchRequest searchRequest, int offset, int limit) {
            return null;
        }
    };

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(indexerMock.getIndexerEntity()).thenReturn(indexerEntityMock);
        when(indexerEntityMock.getStatus()).thenReturn(statusMock);
        when(statusMock.getLevel()).thenReturn(0);
        when(indexerEntityMock.getName()).thenReturn("indexerName");
        when(indexerMock.getName()).thenReturn("indexerName");

        testee.indexer = indexerEntityMock;
    }

    @Test
    public void shouldCreateNewSearchResultEntityWhenNoneIsFound() throws Exception {
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexerMock);
        item.setTitle("title");
        item.setDetails("details");
        item.setIndexerGuid("guid");

        testee.persistSearchResults(Collections.singletonList(item));

        verify(searchResultRepositoryMock).save(searchResultEntitiesCaptor.capture());

        List<SearchResultEntity> persistedEntities = searchResultEntitiesCaptor.getValue();
        assertThat(persistedEntities.size(), is(1));
        assertThat(persistedEntities.get(0).getTitle(), is("title"));
        assertThat(persistedEntities.get(0).getDetails(), is("details"));
        assertThat(persistedEntities.get(0).getIndexerGuid(), is("guid"));
    }

    @Test
    public void shouldNotCreateNewSearchResultEntityWhenOneExists() throws Exception {
        SearchResultItem item = new SearchResultItem();
        item.setIndexerGuid("guid");
        item.setIndexer(indexerMock);
        when(searchResultRepositoryMock.findByIndexerAndIndexerGuid(indexerEntityMock, "guid")).thenReturn(searchResultEntityMock);


        testee.persistSearchResults(Collections.singletonList(item));

        verify(searchResultRepositoryMock).save(searchResultEntitiesCaptor.capture());

        List<SearchResultEntity> persistedEntities = searchResultEntitiesCaptor.getValue();
        assertThat(persistedEntities.size(), is(0));
    }


    @Test
    public void handleSuccess() throws Exception {
        testee.handleSuccess(IndexerApiAccessType.SEARCH, 0, IndexerApiAccessResult.API_ERROR, "url");

        verify(statusMock).setReason(null);
        verify(statusMock).setDisabledPermanently(false);
        verify(statusMock).setLevel(0);
        verify(statusMock).setDisabledUntil(null);

        verify(indexerRepositoryMock).save(indexerEntityMock);
    }

    @Test
    public void handleFailure() throws Exception {
        testee.handleFailure("reason", true, null, null, null, null);
        ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);

        verify(statusMock).setReason("reason");
        verify(statusMock).setDisabledPermanently(true);
        verify(statusMock).setDisabledUntil(captor.capture());
        verify(statusMock).setLevel(1);

        assertTrue(captor.getValue().minus(AbstractIndexer.DISABLE_PERIODS.get(1) - 1, ChronoUnit.MINUTES).isAfter(Instant.now()));
        assertTrue(captor.getValue().minus(AbstractIndexer.DISABLE_PERIODS.get(1) + 1, ChronoUnit.MINUTES).isBefore(Instant.now()));


        verify(indexerRepositoryMock).save(indexerEntityMock);
    }

    @Test
    public void hashItem() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        item1.setIndexerGuid("a");
        SearchResultItem item2 = new SearchResultItem();
        item2.setIndexerGuid("b");
        when(indexerEntityMock.getName()).thenReturn("indexerName1", "indexerName1");
        assertThat(testee.hashItem(item1), is(testee.hashItem(item1)));
        when(indexerEntityMock.getName()).thenReturn("indexerName1", "indexerName1");
        assertThat(testee.hashItem(item1), not(testee.hashItem(item2)));

        when(indexerEntityMock.getName()).thenReturn("indexerName1", "indexerName2");
        assertThat(testee.hashItem(item1), not(testee.hashItem(item1)));
        when(indexerEntityMock.getName()).thenReturn("indexerName1", "indexerName2");
        assertThat(testee.hashItem(item1), not(testee.hashItem(item2)));

    }

}