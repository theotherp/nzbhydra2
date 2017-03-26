package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.database.*;
import org.nzbhydra.rssmapping.RssError;
import org.nzbhydra.rssmapping.Xml;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.infos.Info;
import org.nzbhydra.searching.infos.InfoProvider;
import org.nzbhydra.searching.infos.InfoProvider.IdType;
import org.nzbhydra.searching.infos.InfoProviderException;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.http.HttpStatus;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import static junit.framework.TestCase.assertFalse;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SuppressWarnings("ALL")
public class NewznabTest {

    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private RestTemplate restTemplateMock;
    @Mock
    private IndexerEntity indexerEntityMock;
    @Mock
    private IndexerStatusEntity indexerStatusEntityMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    @Mock
    private IndexerSearchRepository indexerSearchRepositoryMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private UriComponentsBuilder uriComponentsBuilderMock;
    @Captor
    ArgumentCaptor<String> errorMessageCaptor;
    @Captor
    ArgumentCaptor<Boolean> disabledPermanentlyCaptor;
    @Captor
    ArgumentCaptor<? extends IndexerApiAccessResult> indexerApiAccessResultCaptor;
    @Mock
    BaseConfig baseConfigMock;
    @Mock
    SearchingConfig searchingConfigMock;

    @InjectMocks
    private Newznab testee = new Newznab();


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = spy(testee);
        when(infoProviderMock.canConvert(IdType.IMDB, IdType.TMDB)).thenReturn(true);
        Info info = new Info();
        info.setImdbId("imdbId");
        info.setTmdbId("tmdbId");
        info.setTvMazeId("tvMazeId");
        info.setTvRageId("tvRageId");
        info.setTvDbId("tvDbId");
        when(infoProviderMock.convert("imdbId", IdType.IMDB)).thenReturn(info);
        when(infoProviderMock.convert("tvMazeId", IdType.TVMAZE)).thenReturn(info);

        when(indexerEntityMock.getStatus()).thenReturn(indexerStatusEntityMock);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Sets.newSet(IdType.TMDB, IdType.TVRAGE));
        testee.config.setHost("http://127.0.0.1:1234");

        when(baseConfigMock.getSearching()).thenReturn(searchingConfigMock);
    }

    @Test
    public void shouldGetIdsIfNoneOfTheProvidedAreSupported() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        searchRequest.getIdentifiers().put(IdType.TVMAZE, "tvMazeId");
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertTrue(params.containsKey("tmdbid"));
        assertTrue(params.containsKey("rid"));
        assertTrue(params.containsKey("tvmazeid"));

        verify(infoProviderMock, times(1)).convert(anyString(), any(IdType.class));
    }

    @Test
    public void shouldNotGetInfosIfAtLeastOneProvidedIsSupported() throws Exception {
        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Sets.newSet(IdType.IMDB));
        SearchRequest searchRequest = new SearchRequest(SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertEquals(1, params.size());
        verify(infoProviderMock, never()).convert(anyString(), any(IdType.class));
    }


    @Test
    public void shouldThrowAuthException() {
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenReturn(new RssError("101", "Wrong api key"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchType.SEARCH, 0, 100));

        assertEquals("Indexer refused authentication. Error code: 101. Description: Wrong api key", errorMessageCaptor.getValue());
        assertTrue(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.AUTH_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowProgramErrorCodeException() {
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenReturn(new RssError("200", "Whatever"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchType.SEARCH, 0, 100));

        assertEquals("Indexer returned error code 200 when URL http://127.0.0.1:1234/api?apikey&t=search was called", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.HYDRA_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowErrorCodeThatsNotMyFaultException() {
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenReturn(new RssError("123", "Whatever"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchType.SEARCH, 0, 100));

        assertEquals("Indexer returned with error code 123 and description Whatever", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.API_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowIndexerUnreachableException() {
        HttpClientErrorException exception = new HttpClientErrorException(HttpStatus.BAD_REQUEST, "errorMessage");
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenThrow(exception);
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchType.SEARCH, 0, 100));

        assertEquals("Error calling URL http://127.0.0.1:1234/api?apikey&t=search: 400 errorMessage", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.CONNECTION_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldConvertIdIfNecessary() throws InfoProviderException {
        SearchRequest searchRequest = new SearchRequest(SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        testee.config.getSupportedSearchIds().add(IdType.TMDB);

        testee.extendQueryWithSearchIds(searchRequest, uriComponentsBuilderMock);

        verify(uriComponentsBuilderMock).queryParam("tmdbid", "tmdbId");
    }

    @Test
    public void shouldNotConvertIdIfNotNecessary() throws InfoProviderException {
        SearchRequest searchRequest = new SearchRequest(SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.TMDB, "tmdbId");

        testee.extendQueryWithSearchIds(searchRequest, uriComponentsBuilderMock);

        verify(infoProviderMock, never()).convert(anyString(), eq(IdType.TMDB));
    }


}