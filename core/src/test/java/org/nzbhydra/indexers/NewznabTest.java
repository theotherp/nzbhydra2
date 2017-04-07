package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessResult;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.IndexerSearchRepository;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.rssmapping.RssError;
import org.nzbhydra.rssmapping.Xml;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.http.HttpStatus;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;

import static junit.framework.TestCase.assertFalse;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
        MediaInfo info = new MediaInfo();
        info.setImdbId("imdbId");
        info.setTmdbId("tmdbId");
        info.setTvmazeId("tvmazeId");
        info.setTvrageId("tvrageId");
        info.setTvdbId("tvdbId");
        when(infoProviderMock.convert("imdbId", IdType.IMDB)).thenReturn(info);
        when(infoProviderMock.convert("tvmazeId", IdType.TVMAZE)).thenReturn(info);

        when(indexerEntityMock.getStatus()).thenReturn(indexerStatusEntityMock);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Sets.newSet(IdType.TMDB, IdType.TVRAGE));
        testee.config.setHost("http://127.0.0.1:1234");

        when(baseConfigMock.getSearching()).thenReturn(searchingConfigMock);
        when(searchingConfigMock.getGenerateQueries()).thenReturn(SearchSourceRestriction.NONE);
    }

    @Test
    public void shouldGetIdsIfNoneOfTheProvidedAreSupported() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        searchRequest.getIdentifiers().put(IdType.TVMAZE, "tvmazeId");
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryUrlWithSearchIds(searchRequest, builder);
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
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryUrlWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertEquals(1, params.size());
        verify(infoProviderMock, never()).convert(anyString(), any(IdType.class));
    }

    @Test
    public void shouldGenerateQueryIfNecessaryAndAllowed() throws Exception {
        testee.config = new IndexerConfig();
        when(searchingConfigMock.getGenerateQueries()).thenReturn(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchIds(Collections.emptySet());
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        when(infoProviderMock.canConvert(any(), any())).thenReturn(false);
        MediaInfo mediaInfo = new MediaInfo();
        mediaInfo.setTitle("someMovie");
        when(infoProviderMock.convert("imdbId", IdType.IMDB)).thenReturn(mediaInfo);

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?apikey&t=search&imdbid=imdbId&q=someMovie").build(), testee.buildSearchUrl(searchRequest).build());

        //Should use title if provided
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setTitle("anotherTitle");
        UriComponents actual = testee.buildSearchUrl(searchRequest).build();
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?apikey&t=search&q=anotherTitle&title=anotherTitle").build(), actual);
    }

    @Test
    public void shouldThrowAuthException() throws Exception {
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenReturn(new RssError("101", "Wrong api key"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Indexer refused authentication. Error code: 101. Description: Wrong api key", errorMessageCaptor.getValue());
        assertTrue(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.AUTH_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowProgramErrorCodeException() throws Exception {
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenReturn(new RssError("200", "Whatever"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Indexer returned error code 200 when URL http://127.0.0.1:1234/api?apikey&t=search was called", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.HYDRA_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowErrorCodeThatsNotMyFaultException() throws Exception {
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenReturn(new RssError("123", "Whatever"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Indexer returned with error code 123 and description Whatever", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.API_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowIndexerUnreachableException() throws Exception {
        HttpClientErrorException exception = new HttpClientErrorException(HttpStatus.BAD_REQUEST, "errorMessage");
        when(restTemplateMock.getForObject(anyString(), eq(Xml.class))).thenThrow(exception);
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Error calling URL http://127.0.0.1:1234/api?apikey&t=search: 400 errorMessage", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerApiAccessResult.CONNECTION_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldConvertIdIfNecessary() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        testee.config.getSupportedSearchIds().add(IdType.TMDB);

        testee.extendQueryUrlWithSearchIds(searchRequest, uriComponentsBuilderMock);

        verify(uriComponentsBuilderMock).queryParam("tmdbid", "tmdbId");
    }

    @Test
    public void shouldNotConvertIdIfNotNecessary() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.TMDB, "tmdbId");

        testee.extendQueryUrlWithSearchIds(searchRequest, uriComponentsBuilderMock);

        verify(infoProviderMock, never()).convert(anyString(), eq(IdType.TMDB));
    }

    @Test
    public void shouldAddExcludedAndRequiredWordsToQuery() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Sets.newSet("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=--a --b --c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Sets.newSet("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=aquery --a --b --c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Sets.newSet("a", "b", "c"));
        searchRequest.getInternalData().setRequiredWords(Sets.newSet("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=x y z --a --b --c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest.getCategory().getForbiddenWords().add("catforbidden");
        searchRequest.getCategory().getRequiredWords().add("catrequired");
        when(searchingConfigMock.getForbiddenWords()).thenReturn(Sets.newSet("globalforbidden"));
        when(searchingConfigMock.getRequiredWords()).thenReturn(Sets.newSet("globalrequired"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=x y z globalrequired catrequired --a --b --c --globalforbidden --catforbidden").build(), testee.buildSearchUrl(searchRequest).build());
    }

    @Test
    public void shouldNotUseMoreThan12WordsForNzbGeek() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Sets.newSet("a", "b", "c"));

        testee.config.setHost("http://www.nzbgeek.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Sets.newSet("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"));
        UriComponents actual = testee.buildSearchUrl(searchRequest).build();

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.nzbgeek.com/api?apikey&t=search&q=1 2 3 4 5 6 7 8 9 10 11 12").build(), actual);

        searchRequest.setQuery("a b c d");
        searchRequest.getInternalData().setExcludedWords(Sets.newSet("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.nzbgeek.com/api?apikey&t=search&q=a b c d 1 2 3 4 5 6 7 8").build(), testee.buildSearchUrl(searchRequest).build());
    }


}