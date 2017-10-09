package org.nzbhydra.indexers;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Sets;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.mediainfo.TvInfo;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.ResultAcceptor;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultRepository;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class IndexerTest {

    private BaseConfig baseConfig;
    @Mock
    private IndexerEntity indexerEntityMock;
    @Mock
    private Indexer indexerMock;
    @Mock
    private IndexerStatusEntity statusMock;
    @Mock
    private SearchResultEntity searchResultEntityMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerWebAccess indexerWebAccessMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private IndexerApiAccessEntityShortRepository shortRepositoryMock;
    @Mock
    private SearchResultRepository searchResultRepositoryMock;
    @Captor
    private ArgumentCaptor<List<SearchResultEntity>> searchResultEntitiesCaptor;
    @Captor
    private ArgumentCaptor<String> errorMessageCaptor;
    @Captor
    private ArgumentCaptor<Boolean> disabledPermanentlyCaptor;
    @Captor
    private ArgumentCaptor<SearchRequest> searchRequestCaptor;
    @Captor
    private ArgumentCaptor<? extends IndexerAccessResult> indexerApiAccessResultCaptor;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private ResultAcceptor resultAcceptor;
    @Mock
    private ApplicationEventPublisher eventPublisherMock;
    @Mock
    private InfoProvider infoProviderMock;

    private List<SearchResultItem> searchResultItemsToReturn = Collections.emptyList();

    @InjectMocks
    private Indexer testee = new Indexer<String>() {
        @Override
        protected Logger getLogger() {
            return LoggerFactory.getLogger("test");
        }


        @Override
        protected void completeIndexerSearchResult(String response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest) {
            indexerSearchResult.setTotalResults(searchResultItemsToReturn.size());
            indexerSearchResult.setHasMoreResults(false);
        }

        @Override
        protected List<SearchResultItem> getSearchResultItems(String searchRequestResponse) {
            return searchResultItemsToReturn;
        }

        @Override
        protected UriComponentsBuilder buildSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
            return UriComponentsBuilder.fromHttpUrl("http://127.0.0.1");
        }

        @Override
        public NfoResult getNfo(String guid) {
            return null;
        }

        @Override
        protected String getAndStoreResultToDatabase(URI uri, IndexerApiAccessType apiAccessType) throws IndexerAccessException {
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
        testee.config = new IndexerConfig();
        testee.config.setTimeout(1);
        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setIdFallbackToQueryGeneration(SearchSourceRestriction.BOTH);

        when(resultAcceptor.acceptResults(anyList(), any(), any())).then(new Answer<Object>() {
            @Override
            public Object answer(InvocationOnMock invocation) throws Throwable {
                return new AcceptorResult(invocation.getArgument(0), HashMultiset.create());
            }
        });

        when(infoProviderMock.convert(anyString(), any())).thenReturn(new MediaInfo(new TvInfo("tvdbid", "tvrageid", "tvmazeid", "title", 2017, "")));

        testee = spy(testee);
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
        when(searchResultEntityMock.getIndexerGuid()).thenReturn("guid");
        when(searchResultRepositoryMock.findAllIdsByIdIn(anyList())).thenReturn(Sets.newHashSet(-6656469538734781699L));

        testee.persistSearchResults(Collections.singletonList(item));

        verify(searchResultRepositoryMock).save(searchResultEntitiesCaptor.capture());

        List<SearchResultEntity> persistedEntities = searchResultEntitiesCaptor.getValue();
        assertThat(persistedEntities.size(), is(0));
    }


    @Test
    public void handleSuccess() throws Exception {
        when(indexerMock.getIndexerEntity().getStatus()).thenReturn(statusMock);
        testee.handleSuccess(IndexerApiAccessType.SEARCH, 0L);

        verify(statusMock).setDisabledPermanently(false);
        verify(statusMock).setLevel(0);
        verify(statusMock).setDisabledUntil(null);

        verify(indexerRepositoryMock).save(indexerEntityMock);
    }

    @Test
    public void handleFailure() throws Exception {
        testee.handleFailure("reason", true, null, null, null);
        ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);

        verify(statusMock).setReason("reason");
        verify(statusMock).setDisabledPermanently(true);
        verify(statusMock).setDisabledUntil(captor.capture());
        verify(statusMock).setLevel(1);

        assertTrue(captor.getValue().minus(Indexer.DISABLE_PERIODS.get(1) - 1, ChronoUnit.MINUTES).isAfter(Instant.now()));
        assertTrue(captor.getValue().minus(Indexer.DISABLE_PERIODS.get(1) + 1, ChronoUnit.MINUTES).isBefore(Instant.now()));

        verify(indexerRepositoryMock).save(indexerEntityMock);
    }

    @Test
    public void shouldGetAndStoreResultToDatabaseWithSuccess() throws Exception {
        when(indexerWebAccessMock.get(any(), eq(String.class), eq(testee.config))).thenReturn("result");

        String result = (String) testee.getAndStoreResultToDatabase(new URI("http://127.0.0.1"), String.class, IndexerApiAccessType.SEARCH);

        assertThat(result, is("result"));
        verify(testee).handleSuccess(eq(IndexerApiAccessType.SEARCH), anyLong());
    }

    @Test(expected = IndexerAccessException.class)
    public void shouldGetAndStoreResultToDatabaseWithError() throws Exception {
        IndexerAccessException exception = new IndexerAccessException("error");
        when(indexerWebAccessMock.get(any(), eq(String.class), eq(testee.config))).thenThrow(exception);

        testee.getAndStoreResultToDatabase(new URI("http://127.0.0.1"), String.class, IndexerApiAccessType.SEARCH);

        verify(testee).handleIndexerAccessException(exception, IndexerApiAccessType.SEARCH);
    }

    @Test
    public void shouldHandleIndexerAccessException() throws Exception {
        IndexerAccessException exception = new IndexerAuthException("error");
        testee.handleIndexerAccessException(exception, IndexerApiAccessType.SEARCH);
        verify(testee).handleFailure("error", true, IndexerApiAccessType.SEARCH, null, IndexerAccessResult.AUTH_ERROR);

        exception = new IndexerUnreachableException("error");
        testee.handleIndexerAccessException(exception, IndexerApiAccessType.SEARCH);
        verify(testee).handleFailure("error", false, IndexerApiAccessType.SEARCH, null, IndexerAccessResult.CONNECTION_ERROR);

        exception = new IndexerErrorCodeException(new RssError("101", "errorMessage"));
        testee.handleIndexerAccessException(exception, IndexerApiAccessType.SEARCH);
        verify(testee).handleFailure("Indexer returned with error code 101 and description errorMessage", false, IndexerApiAccessType.SEARCH, null, IndexerAccessResult.API_ERROR);
    }

    @Test
    public void shouldUseFallback() throws Exception {

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        Map<IdType, String> identifiers = new HashMap<>();
        identifiers.put(IdType.IMDB, "123");
        searchRequest.setIdentifiers(identifiers);
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexerMock);
        item.setIndexerGuid("indexerGuid");
        //searchResultItemsToReturn = Arrays.asList(item);

        IndexerSearchResult search = testee.search(searchRequest, 0, 100);
        verify(testee, times(2)).searchInternal(searchRequestCaptor.capture(), anyInt(), anyInt());
    }

    @Test
    public void shouldGenerateQuery() throws IndexerSearchAbortedException {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        Map<IdType, String> identifiers = new HashMap<>();
        identifiers.put(IdType.IMDB, "123");
        searchRequest.setIdentifiers(identifiers);
        String query = testee.generateQueryIfApplicable(searchRequest, "query");
        assertThat(query, is("title"));
    }

    @Test
    public void shouldSanitizeQuery() throws IndexerSearchAbortedException, InfoProviderException {
        when(infoProviderMock.convert(anyString(), any())).thenReturn(new MediaInfo(new TvInfo("tvdbid", "tvrageid", "tvmazeid", "title()':", 2017, "")));
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        Map<IdType, String> identifiers = new HashMap<>();
        identifiers.put(IdType.IMDB, "123");
        searchRequest.setIdentifiers(identifiers);
        String query = testee.generateQueryIfApplicable(searchRequest, "query");
        assertThat(query, is("title"));
    }


}