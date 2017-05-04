package org.nzbhydra.indexers;

import com.google.common.collect.Lists;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.database.IndexerAccessResult;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.IndexerSearchRepository;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.mapping.newznab.Enclosure;
import org.nzbhydra.mapping.newznab.JaxbPubdateAdapter;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssGuid;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;

import static junit.framework.TestCase.assertFalse;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
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
    private IndexerWebAccess indexerWebAccessMock;
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
    ArgumentCaptor<? extends IndexerAccessResult> indexerApiAccessResultCaptor;
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
        testee.config.setSupportedSearchIds(Lists.newArrayList(IdType.TMDB, IdType.TVRAGE));
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
        testee.config.setSupportedSearchIds(Lists.newArrayList(IdType.IMDB));
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
        testee.config.setSupportedSearchIds(Collections.emptyList());
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
        when(indexerWebAccessMock.get(anyString(), eq(Xml.class), anyInt())).thenReturn(new RssError("101", "Wrong api key"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Indexer refused authentication. Error code: 101. Description: Wrong api key", errorMessageCaptor.getValue());
        assertTrue(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerAccessResult.AUTH_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowProgramErrorCodeException() throws Exception {
        when(indexerWebAccessMock.get(anyString(), eq(Xml.class), anyInt())).thenReturn(new RssError("200", "Whatever"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Indexer returned error code 200 when URL http://127.0.0.1:1234/api?apikey&t=search was called", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerAccessResult.HYDRA_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowErrorCodeThatsNotMyFaultException() throws Exception {
        when(indexerWebAccessMock.get(anyString(), eq(Xml.class), anyInt())).thenReturn(new RssError("123", "Whatever"));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("Indexer returned with error code 123 and description Whatever", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerAccessResult.API_ERROR, indexerApiAccessResultCaptor.getValue());
    }

    @Test
    public void shouldThrowIndexerUnreachableException() throws Exception {
        IndexerUnreachableException exception = new IndexerUnreachableException("message");
        when(indexerWebAccessMock.get(anyString(), eq(Xml.class), anyInt())).thenThrow(exception);
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100));

        assertEquals("message", errorMessageCaptor.getValue());
        assertFalse(disabledPermanentlyCaptor.getValue());
        assertEquals(IndexerAccessResult.CONNECTION_ERROR, indexerApiAccessResultCaptor.getValue());
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
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=--a --b --c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=aquery --a --b --c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        searchRequest.getInternalData().setRequiredWords(Lists.newArrayList("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=x y z --a --b --c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest.getCategory().getForbiddenWords().add("catforbidden");
        searchRequest.getCategory().getRequiredWords().add("catrequired");
        when(searchingConfigMock.getForbiddenWords()).thenReturn(Lists.newArrayList("globalforbidden"));
        when(searchingConfigMock.getRequiredWords()).thenReturn(Lists.newArrayList("globalrequired"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=x y z globalrequired catrequired --a --b --c --globalforbidden --catforbidden").build(), testee.buildSearchUrl(searchRequest).build());
    }

    @Test
    public void shouldUseDifferentExclusionFormatForNzedbAndOmgWtf() throws Exception {
        testee.config.setBackend(BackendType.NZEDB);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=!a,!b,!c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=aquery !a,!b,!c").build(), testee.buildSearchUrl(searchRequest).build());

        testee.config.setBackend(BackendType.NEWZNAB);
        testee.config.setHost("http://www.OMGwtfnzbs.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?apikey&t=search&q=!a,!b,!c").build(), testee.buildSearchUrl(searchRequest).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?apikey&t=search&q=aquery !a,!b,!c").build(), testee.buildSearchUrl(searchRequest).build());

    }

    @Test
    public void shouldNotUseMoreThan12WordsForNzbGeek() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));

        testee.config.setHost("http://www.nzbgeek.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Lists.newArrayList("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"));
        UriComponents actual = testee.buildSearchUrl(searchRequest).build();

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.nzbgeek.com/api?apikey&t=search&q=1 2 3 4 5 6 7 8 9 10 11 12").build(), actual);

        searchRequest.setQuery("a b c d");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.nzbgeek.com/api?apikey&t=search&q=a b c d 1 2 3 4 5 6 7 8").build(), testee.buildSearchUrl(searchRequest).build());
    }

    @Test
    public void shouldCreateSearchResultItem() throws Exception {
        RssItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("password", "0"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("group", "group"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("poster", "poster"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("files", "10"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("grabs", "20"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("comments", "30"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("usenetdate", new JaxbPubdateAdapter().marshal(Instant.ofEpochSecond(6666666))));

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getLink(), is("http://indexer.com/123"));
        assertThat(item.getIndexerGuid(), is("123"));
        assertThat(item.getSize(), is(456L));
        assertThat(item.getDescription(), is("description"));
        assertThat(item.getPubDate(), is(Instant.ofEpochSecond(5555555)));
        assertThat(item.getCommentsLink(), is("http://indexer.com/123/details#comments"));
        assertThat(item.getDetails(), is("http://indexer.com/123/details"));
        assertThat(item.isAgePrecise(), is(true));
        assertThat(item.getUsenetDate().get(), is(Instant.ofEpochSecond(6666666)));
        assertThat(item.getDownloadType(), is(DownloadType.NZB));

        assertThat(item.isPassworded(), is(false));
        assertThat(item.getGroup().get(), is("group"));
        assertThat(item.getPoster().get(), is("poster"));
        assertThat(item.getFiles(), is(10));
        assertThat(item.getGrabs(), is(20));
        assertThat(item.getCommentsCount(), is(30));

        rssItem.setRssGuid(new RssGuid("123", false));
        assertThat(testee.createSearchResultItem(rssItem).getIndexerGuid(), is("123"));


    }

    private RssItem buildBasicRssItem() {
        RssItem rssItem = new RssItem();
        rssItem.setLink("http://indexer.com/123");
        rssItem.setRssGuid(new RssGuid("http://indexer.com/123", true));
        rssItem.setTitle("title");
        rssItem.setEnclosure(new Enclosure("http://indexer.com/123", 456L));
        rssItem.setPubDate(Instant.ofEpochSecond(5555555));
        rssItem.setDescription("description");
        rssItem.setComments("http://indexer.com/123/details#comments");
        rssItem.setNewznabAttributes(new ArrayList<>());
        return rssItem;
    }

    @Test
    public void shouldNotSetGroupOrPosterIfNotAvailable() throws Exception {
        RssItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("group", "not available"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("poster", "not available"));
        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getGroup().isPresent(), is(false));
        assertThat(item.getPoster().isPresent(), is(false));
    }

    @Test
    public void shouldReadGroupFromDescription() throws Exception {
        RssItem rssItem = buildBasicRssItem();
        rssItem.setDescription("<b>Group:</b> alt.binaries.tun<br />");
        assertThat(testee.createSearchResultItem(rssItem).getGroup().get(), is("alt.binaries.tun"));
    }

    @Test
    public void shouldRemoveTrailingLanguages() throws Exception {
        when(searchingConfigMock.isRemoveLanguage()).thenReturn(true);

        RssItem rssItem = buildBasicRssItem();
        rssItem.setTitle("Some title English");
        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title"));
    }

    @Test
    public void shouldRemoveObfuscatedFromNzbGeek() throws Exception {
        when(searchingConfigMock.isRemoveObfuscated()).thenReturn(true);
        testee.config.setHost("nzbgeek");

        RssItem rssItem = buildBasicRssItem();
        rssItem.setTitle("Some title -Obfuscated");
        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title "));
    }


}