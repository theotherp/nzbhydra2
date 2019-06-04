package org.nzbhydra.indexers;

import com.google.common.base.Stopwatch;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Sets;
import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.exceptions.*;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.InfoProviderException;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.mediainfo.TvInfo;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class IndexerTest {

    private BaseConfig baseConfig;
    @Mock
    private IndexerEntity indexerEntityMock;
    private IndexerConfig indexerConfig = new IndexerConfig();
    @Mock
    private Indexer indexerMock;
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
    private SearchResultAcceptor resultAcceptor;
    @Mock
    private ApplicationEventPublisher eventPublisherMock;
    @Mock
    private InfoProvider infoProviderMock;

    private List<SearchResultItem> searchResultItemsToReturn = Collections.emptyList();

    @InjectMocks
    private Indexer testee = getTestee();

    private Indexer<String> getTestee() {
        return new Indexer<String>() {
            @Override
            protected Logger getLogger() {
                return LoggerFactory.getLogger("test");
            }


            @Override
            protected void completeIndexerSearchResult(String response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
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
    }

    @Before
    public void setUp() throws Exception {

        MockitoAnnotations.initMocks(this);
        when(indexerMock.getIndexerEntity()).thenReturn(indexerEntityMock);
        when(indexerMock.getConfig()).thenReturn(indexerConfig);
        when(indexerEntityMock.getName()).thenReturn("indexerName");
        when(indexerMock.getName()).thenReturn("indexerName");

        testee.indexer = indexerEntityMock;
        testee.config = indexerConfig;
        indexerConfig.setTimeout(1);
        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setIdFallbackToQueryGeneration(SearchSourceRestriction.BOTH);

        when(resultAcceptor.acceptResults(anyList(), any(), any())).then(new Answer<Object>() {
            @Override
            public Object answer(InvocationOnMock invocation) throws Throwable {
                return new AcceptorResult(invocation.getArgument(0), HashMultiset.create());
            }
        });

        when(infoProviderMock.convert(anyString(), any())).thenReturn(new MediaInfo(new TvInfo("tvdbid", "tvrageid", "tvmazeid", null, "title", 2017, "")));

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

        verify(searchResultRepositoryMock).saveAll(searchResultEntitiesCaptor.capture());

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
        when(searchResultRepositoryMock.findAllIdsByIdIn(anyList())).thenReturn(Sets.newHashSet(299225959498991027L));

        testee.persistSearchResults(Collections.singletonList(item));

        verify(searchResultRepositoryMock).saveAll(searchResultEntitiesCaptor.capture());

        List<SearchResultEntity> persistedEntities = searchResultEntitiesCaptor.getValue();
        assertThat(persistedEntities.size(), is(0));
    }


    @Test
    public void handleSuccess() throws Exception {
        indexerConfig.setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        indexerConfig.setDisabledLevel(1);
        indexerConfig.setDisabledUntil(Instant.now().toEpochMilli());

        testee.handleSuccess(IndexerApiAccessType.SEARCH, 0L);

        assertThat(indexerConfig.getState(), is(IndexerConfig.State.ENABLED));
        assertThat(indexerConfig.getDisabledLevel(), is(0));
        assertThat(indexerConfig.getDisabledUntil(), is(nullValue()));
    }

    @Test
    public void handleFailure() throws Exception {
        indexerConfig.setState(IndexerConfig.State.ENABLED);
        indexerConfig.setDisabledLevel(0);
        indexerConfig.setDisabledUntil(null);

        testee.handleFailure("reason", false, null, null, null);

        assertThat(indexerConfig.getState(), is(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY));
        assertThat(indexerConfig.getDisabledLevel(), is(1));
        long disabledPeriod = Math.abs(Instant.ofEpochMilli(indexerConfig.getDisabledUntil()).getEpochSecond() - Instant.now().getEpochSecond());
        long delta = Math.abs(Indexer.DISABLE_PERIODS.get(1) * 60 - disabledPeriod);
        org.assertj.core.api.Assertions.assertThat(delta).isLessThan(5);

        indexerConfig.setState(IndexerConfig.State.ENABLED);
        indexerConfig.setDisabledLevel(0);
        indexerConfig.setDisabledUntil(null);

        testee.handleFailure("reason", true, null, null, null);

        assertThat(indexerConfig.getState(), is(IndexerConfig.State.DISABLED_SYSTEM));
    }

    @Test
    public void shouldGetAndStoreResultToDatabaseWithSuccess() throws Exception {
        when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenReturn("result");

        String result = (String) testee.getAndStoreResultToDatabase(new URI("http://127.0.0.1"), String.class, IndexerApiAccessType.SEARCH);

        assertThat(result, is("result"));
        verify(testee).handleSuccess(eq(IndexerApiAccessType.SEARCH), anyLong());
    }

    @Test(expected = IndexerAccessException.class)
    public void shouldGetAndStoreResultToDatabaseWithError() throws Exception {
        IndexerAccessException exception = new IndexerAccessException("error");
        when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenThrow(exception);

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

        exception = new IndexerErrorCodeException(new NewznabXmlError("101", "errorMessage"));
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
        when(infoProviderMock.convert(anyString(), any())).thenReturn(new MediaInfo(new TvInfo("tvdbid", "tvrageid", "tvmazeid", null, "title()':", 2017, "")));
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        Map<IdType, String> identifiers = new HashMap<>();
        identifiers.put(IdType.IMDB, "123");
        searchRequest.setIdentifiers(identifiers);
        String query = testee.generateQueryIfApplicable(searchRequest, "query");
        assertThat(query, is("title"));
    }

    @Test
    public void shouldRemoveTrailing() throws Exception {
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("trailing1", "trailing2"));
        String result = testee.cleanUpTitle("abc trailing1 trailing2");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        result = testee.cleanUpTitle("abc trailing1 trailing2 def");
        assertThat(result, is("abc trailing1 trailing2 def"));

        testee.handleNewConfig(null);
        result = testee.cleanUpTitle("abc");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
        result = testee.cleanUpTitle("abc");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("trailing*"));
        result = testee.cleanUpTitle("abc trailing1 trailing2");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("-obfuscated"));
        result = testee.cleanUpTitle("abc-obfuscated");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("-obfuscated******"));
        result = testee.cleanUpTitle("abc-obfuscated");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("[*]"));
        result = testee.cleanUpTitle("abc [obfuscated]");
        assertThat(result, is("abc"));

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("[*]"));
        result = testee.cleanUpTitle("abc [obfuscated] def");
        assertThat(result, is("abc [obfuscated] def"));
    }

    @Test
    public void shouldRemoveTrailing2() {
        List<String> collect = IntStream.range(1, 100).mapToObj(x -> "trailing" + x + "*********").collect(Collectors.toList());
        List<String> all = new ArrayList<>();
        all.addAll(collect);
        all.add("trailing*");
        baseConfig.getSearching().setRemoveTrailing(all);

        testee.cleanUpTitle("abc trailing1 trailing2");
        testee.cleanUpTitle("abc trailing1 trailing2");
        testee.cleanUpTitle("abc trailing1 trailing2");
        Stopwatch stopwatch = Stopwatch.createStarted();
        for (int i = 0; i < 100; i++) {
            testee.cleanUpTitle("abc trailing1 trailing2");
        }
        System.out.println(stopwatch.elapsed(TimeUnit.MILLISECONDS));


    }


}