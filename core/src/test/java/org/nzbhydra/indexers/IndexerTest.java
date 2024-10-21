package org.nzbhydra.indexers;

import com.google.common.base.Stopwatch;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Sets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.mediainfo.TvInfo;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class IndexerTest {

    private Logger testLogger = LoggerFactory.getLogger("test");
    private BaseConfig baseConfig;
    private IndexerEntity indexerEntityMock = new IndexerEntity("indexerName");
    private IndexerConfig indexerConfig = new IndexerConfig();
    @Mock
    private Indexer indexerMock;

    private SearchResultEntity searchResultEntityMock = new SearchResultEntity(indexerEntityMock, Instant.now(), "title", "guid", "link", "details", DownloadType.NZB, Instant.now());
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
    @Mock
    private QueryGenerator queryGeneratorMock;
    @Mock
    private BaseConfigHandler baseConfigHandler;

    private List<SearchResultItem> searchResultItemsToReturn = Collections.emptyList();

    @InjectMocks
    private Indexer testee = getTestee();

    private Indexer<String> getTestee() {
        return new Indexer<>() {
            @Override
            protected Logger getLogger() {
                return testLogger;
            }


            @Override
            protected void completeIndexerSearchResult(String response, IndexerSearchResult indexerSearchResult, AcceptorResult acceptorResult, SearchRequest searchRequest, int offset, Integer limit) {
                indexerSearchResult.setTotalResults(searchResultItemsToReturn.size());
                indexerSearchResult.setHasMoreResults(false);
            }

            @Override
            protected List<SearchResultItem> getSearchResultItems(String searchRequestResponse, SearchRequest searchRequest) {
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

    @BeforeEach
    public void setUp() throws Exception {

        MockitoAnnotations.initMocks(this);
        when(indexerMock.getIndexerEntity()).thenReturn(indexerEntityMock);
        when(indexerMock.getConfig()).thenReturn(indexerConfig);

        when(indexerMock.getName()).thenReturn("indexerName");

        testee.indexer = indexerEntityMock;
        testee.config = indexerConfig;
        indexerConfig.setName("testIndexer");
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

        when(queryGeneratorMock.generateQueryIfApplicable(any(), any(), any())).thenAnswer((Answer<String>) invocation -> {
            final SearchRequest searchRequest = invocation.getArgument(0);
            if (searchRequest.getQuery().isPresent()) {
                return searchRequest.getQuery().get();
            }
            return invocation.getArgument(1);
        });
    }

    @Test
    void shouldCreateNewSearchResultEntityWhenNoneIsFound() throws Exception {
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexerMock);
        item.setTitle("title");
        item.setDetails("details");
        item.setIndexerGuid("guid");

        testee.persistSearchResults(Collections.singletonList(item), new IndexerSearchResult());

        verify(searchResultRepositoryMock).saveAll(searchResultEntitiesCaptor.capture());

        List<SearchResultEntity> persistedEntities = searchResultEntitiesCaptor.getValue();
        assertThat(persistedEntities.size()).isEqualTo(1);
        assertThat(persistedEntities.get(0).getTitle()).isEqualTo("title");
        assertThat(persistedEntities.get(0).getDetails()).isEqualTo("details");
        assertThat(persistedEntities.get(0).getIndexerGuid()).isEqualTo("guid");
    }

    @Test
    void shouldNotCreateNewSearchResultEntityWhenOneExists() throws Exception {
        SearchResultItem item = new SearchResultItem();
        item.setIndexerGuid("guid");
        item.setIndexer(indexerMock);
        searchResultEntityMock.setIndexerGuid("guid");
        when(searchResultRepositoryMock.findAllIdsByIdIn(anyList())).thenReturn(Sets.newHashSet(299225959498991027L));

        testee.persistSearchResults(Collections.singletonList(item), new IndexerSearchResult());

        verify(searchResultRepositoryMock).saveAll(searchResultEntitiesCaptor.capture());

        List<SearchResultEntity> persistedEntities = searchResultEntitiesCaptor.getValue();
        assertThat(persistedEntities.size()).isEqualTo(0);
    }


    @Test
    void handleSuccess() throws Exception {
        indexerConfig.setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        indexerConfig.setDisabledLevel(1);
        indexerConfig.setDisabledUntil(Instant.now().toEpochMilli());

        testee.handleSuccess(IndexerApiAccessType.SEARCH, 0L);

        assertThat(indexerConfig.getState()).isEqualTo(IndexerConfig.State.ENABLED);
        assertThat(indexerConfig.getDisabledLevel()).isEqualTo(0);
        assertThat(indexerConfig.getDisabledUntil()).isNull();
    }

    @Test
    void handleFailure() throws Exception {
        indexerConfig.setState(IndexerConfig.State.ENABLED);
        indexerConfig.setDisabledLevel(0);
        indexerConfig.setDisabledUntil(null);

        testee.handleFailure("reason", false, null, null, null);

        assertThat(indexerConfig.getState()).isEqualTo(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        assertThat(indexerConfig.getDisabledLevel()).isEqualTo(1);
        long disabledPeriod = Math.abs(Instant.ofEpochMilli(indexerConfig.getDisabledUntil()).getEpochSecond() - Instant.now().getEpochSecond());
        long delta = Math.abs(Indexer.DISABLE_PERIODS.get(1) * 60 - disabledPeriod);
        org.assertj.core.api.Assertions.assertThat(delta).isLessThan(5);

        indexerConfig.setState(IndexerConfig.State.ENABLED);
        indexerConfig.setDisabledLevel(0);
        indexerConfig.setDisabledUntil(null);

        testee.handleFailure("reason", true, null, null, null);

        assertThat(indexerConfig.getState()).isEqualTo(IndexerConfig.State.DISABLED_SYSTEM);
    }

    @Test
    void shouldGetAndStoreResultToDatabaseWithSuccess() throws Exception {
        when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenReturn("result");

        String result = (String) testee.getAndStoreResultToDatabase(new URI("http://127.0.0.1"), String.class, IndexerApiAccessType.SEARCH);

        assertThat(result).isEqualTo("result");
        verify(testee).handleSuccess(eq(IndexerApiAccessType.SEARCH), anyLong());
    }

    @Test
    void shouldGetAndStoreResultToDatabaseWithError() throws Exception {
        assertThrows(IndexerAccessException.class, () -> {
            IndexerAccessException exception = new IndexerAccessException("error");
            when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenThrow(exception);

            testee.getAndStoreResultToDatabase(new URI("http://127.0.0.1"), String.class, IndexerApiAccessType.SEARCH);

            verify(testee).handleIndexerAccessException(exception, IndexerApiAccessType.SEARCH);
        });
    }

    @Test
    void shouldHandleIndexerAccessException() throws Exception {
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
    void shouldUseFallback() throws Exception {

        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        Map<MediaIdType, String> identifiers = new HashMap<>();
        identifiers.put(MediaIdType.IMDB, "123");
        searchRequest.setIdentifiers(identifiers);
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexerMock);
        item.setIndexerGuid("indexerGuid");
        //searchResultItemsToReturn = Arrays.asList(item);

        IndexerSearchResult search = testee.search(searchRequest, 0, 100);
        verify(testee, times(2)).searchInternal(searchRequestCaptor.capture(), anyInt(), anyInt());
    }


    @Test
    void shouldRemoveTrailing() throws Exception {
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("trailing1", "trailing2"));
        String result = testee.cleanUpTitle("abc trailing1 trailing2");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        result = testee.cleanUpTitle("abc trailing1 trailing2 def");
        assertThat(result).isEqualTo("abc trailing1 trailing2 def");

        testee.handleNewConfig(null);
        result = testee.cleanUpTitle("abc");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
        result = testee.cleanUpTitle("abc");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("trailing*"));
        result = testee.cleanUpTitle("abc trailing1 trailing2");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("-obfuscated"));
        result = testee.cleanUpTitle("abc-obfuscated");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("-obfuscated******"));
        result = testee.cleanUpTitle("abc-obfuscated");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("[*]"));
        result = testee.cleanUpTitle("abc [obfuscated]");
        assertThat(result).isEqualTo("abc");

        testee.handleNewConfig(null);
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("[*]"));
        result = testee.cleanUpTitle("abc [obfuscated] def");
        assertThat(result).isEqualTo("abc [obfuscated] def");
    }

    @Test
    void shouldRemoveTrailing2() {
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

    @Test
    public void shouldLogWithMessages() {
        testee.info("Some message {}", "arg1");
    }


}
