package org.nzbhydra.indexers;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Lists;
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
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.database.IndexerAccessResult;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerApiAccessType;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.IndexerSearchRepository;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerProgramErrorException;
import org.nzbhydra.mapping.newznab.Enclosure;
import org.nzbhydra.mapping.newznab.JaxbPubdateAdapter;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.RssChannel;
import org.nzbhydra.mapping.newznab.RssError;
import org.nzbhydra.mapping.newznab.RssGuid;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.Xml;
import org.nzbhydra.mapping.newznab.builder.RssBuilder;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.ResultAcceptor;
import org.nzbhydra.searching.ResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultItem.HasNfo;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.oxm.Unmarshaller;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("ALL")
public class NewznabTest {

    private BaseConfig baseConfig;
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
    private SearchResultRepository searchResultRepositoryMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private UriComponentsBuilder uriComponentsBuilderMock;
    @Mock
    private ResultAcceptor resultAcceptorMock;
    @Mock
    private Unmarshaller unmarshallerMock;
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
    @Mock
    private ConfigProvider configProviderMock;

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

        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.NONE);

        when(resultAcceptorMock.acceptResults(any(), any(), any())).thenAnswer(new Answer<AcceptorResult>() {
            @Override
            public AcceptorResult answer(InvocationOnMock invocation) throws Throwable {
                return new AcceptorResult(invocation.getArgument(0), HashMultiset.create());
            }
        });
    }

    @Test
    public void shouldReturnCorrectSearchResults() throws Exception {
        RssRoot root = RssBuilder.builder().items(Arrays.asList(RssItemBuilder.builder("title").build())).newznabResponse(0, 1).build();
        when(indexerWebAccessMock.get(any(), any(), anyInt())).thenReturn(root);

        IndexerSearchResult indexerSearchResult = testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);

        assertThat(indexerSearchResult.getSearchResultItems().size(), is(1));
        assertThat(indexerSearchResult.getTotalResults(), is(1));
        assertThat(indexerSearchResult.isHasMoreResults(), is(false));
        assertThat(indexerSearchResult.isTotalResultsKnown(), is(true));
    }

    @Test
    public void shouldAccountForRejectedResults() throws Exception {
        List<RssItem> items = Arrays.asList(
                RssItemBuilder.builder("title1").build(),
                RssItemBuilder.builder("title2").build(),
                RssItemBuilder.builder("title3").build(),
                RssItemBuilder.builder("title4").build(),
                RssItemBuilder.builder("title5").build()
        );
        RssRoot root = RssBuilder.builder().items(items).newznabResponse(100, 105).build();
        when(indexerWebAccessMock.get(any(), any(), anyInt())).thenReturn(root);

        //Two items will be rejected
        when(resultAcceptorMock.acceptResults(any(), any(), any())).thenAnswer(new Answer<AcceptorResult>() {
            @Override
            public AcceptorResult answer(InvocationOnMock invocation) throws Throwable {
                List<SearchResultItem> argument = invocation.getArgument(0);
                HashMultiset<String> reasonsForRejection = HashMultiset.create();
                reasonsForRejection.add("some reason", 2);
                return new AcceptorResult(argument.subList(0, 3), reasonsForRejection);
            }
        });

        IndexerSearchResult indexerSearchResult = testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);

        assertThat(indexerSearchResult.getSearchResultItems().size(), is(3));
        assertThat(indexerSearchResult.getTotalResults(), is(105));
        assertThat(indexerSearchResult.isHasMoreResults(), is(false));
        assertThat(indexerSearchResult.isTotalResultsKnown(), is(true));
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
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchIds(Collections.emptyList());
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        when(infoProviderMock.canConvert(any(), any())).thenReturn(false);
        MediaInfo mediaInfo = new MediaInfo();
        mediaInfo.setTitle("someMovie");
        when(infoProviderMock.convert("imdbId", IdType.IMDB)).thenReturn(mediaInfo);

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?apikey&t=search&imdbid=imdbId&q=someMovie").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        //Should use title if provided
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setTitle("anotherTitle");
        UriComponents actual = testee.buildSearchUrl(searchRequest, null, null).build();
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?apikey&t=search&q=anotherTitle&title=anotherTitle").build(), actual);
    }

    @Test(expected = IndexerAuthException.class)
    public void shouldThrowAuthException() throws Exception {
        doReturn(new RssError("101", "Wrong API key")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
    }

    @Test(expected = IndexerProgramErrorException.class)
    public void shouldThrowProgramErrorCodeException() throws Exception {
        doReturn(new RssError("200", "Whatever")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
    }

    @Test(expected = IndexerErrorCodeException.class)
    public void shouldThrowErrorCodeThatsNotMyFaultException() throws Exception {
        doReturn(new RssError("123", "Whatever")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture(), any());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
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
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=--a --b --c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=aquery --a --b --c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        searchRequest.getInternalData().setRequiredWords(Lists.newArrayList("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=x y z --a --b --c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest.getCategory().getForbiddenWords().add("catforbidden");
        searchRequest.getCategory().getRequiredWords().add("catrequired");
        baseConfig.getSearching().setForbiddenWords(Lists.newArrayList("globalforbidden"));
        baseConfig.getSearching().setRequiredWords(Lists.newArrayList("globalrequired"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=x y z globalrequired catrequired --a --b --c --globalforbidden --catforbidden").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shouldUseDifferentExclusionFormatForNzedbAndOmgWtf() throws Exception {
        testee.config.setBackend(BackendType.NZEDB);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=!a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?apikey&t=search&q=aquery !a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        testee.config.setBackend(BackendType.NEWZNAB);
        testee.config.setHost("http://www.OMGwtfnzbs.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?apikey&t=search&q=!a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?apikey&t=search&q=aquery !a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shouldNotUseMoreThan12WordsForNzbGeek() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("a", "b", "c"));

        testee.config.setHost("http://www.nzbgeek.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Lists.newArrayList("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"));
        UriComponents actual = testee.buildSearchUrl(searchRequest, null, null).build();

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.nzbgeek.com/api?apikey&t=search&q=1 2 3 4 5 6 7 8 9 10 11 12").build(), actual);

        searchRequest.setQuery("a b c d");
        searchRequest.getInternalData().setExcludedWords(Lists.newArrayList("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.nzbgeek.com/api?apikey&t=search&q=a b c d 1 2 3 4 5 6 7 8").build(), testee.buildSearchUrl(searchRequest, null, null).build());
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
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5000"));

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getLink(), is("http://indexer.com/nzb/123"));
        assertThat(item.getIndexerGuid(), is("123"));
        assertThat(item.getSize(), is(456L));
        assertThat(item.getDescription(), is("description"));
        assertThat(item.getPubDate(), is(Instant.ofEpochSecond(5555555)));
        assertThat(item.getCommentsLink(), is("http://indexer.com/details/123x#comments"));
        assertThat(item.getDetails(), is("http://indexer.com/details/123"));
        assertThat(item.isAgePrecise(), is(true));
        assertThat(item.getUsenetDate().get(), is(Instant.ofEpochSecond(6666666)));
        assertThat(item.getDownloadType(), is(DownloadType.NZB));

        assertThat(item.isPassworded(), is(false));
        assertThat(item.getGroup().get(), is("group"));
        assertThat(item.getPoster().get(), is("poster"));
        assertThat(item.getFiles(), is(10));
        assertThat(item.getGrabs(), is(20));
        assertThat(item.getCommentsCount(), is(30));
        verify(categoryProviderMock, times(1)).fromNewznabCategories(Arrays.asList(5000));

        rssItem.setRssGuid(new RssGuid("123", false));
        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("password", "1"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("nfo", "1"));
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid(), is("123"));
        assertThat(item.isPassworded(), is(true));
        assertThat(item.getHasNfo(), is(HasNfo.YES));
    }

    private RssItem buildBasicRssItem() {
        RssItem rssItem = new RssItem();
        rssItem.setLink("http://indexer.com/nzb/123");
        rssItem.setRssGuid(new RssGuid("http://indexer.com/details/123", true));
        rssItem.setTitle("title");
        rssItem.setEnclosure(new Enclosure("http://indexer.com/nzb/123", 456L));
        rssItem.setPubDate(Instant.ofEpochSecond(5555555));
        rssItem.setDescription("description");
        rssItem.setComments("http://indexer.com/details/123x#comments");
        rssItem.setNewznabAttributes(new ArrayList<>());
        return rssItem;
    }

    @Test
    public void shouldGetDetailsLinkFromRssGuidIfPermalink() throws Exception {
        RssItem rssItem = buildBasicRssItem();
        rssItem.setRssGuid(new RssGuid("detailsLink", true));
        rssItem.setComments("http://indexer.com/123/detailsfromcomments#comments");

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getDetails(), is("detailsLink"));
    }

    @Test
    public void shouldGetDetailsLinkFromCommentsIfNotSetFromRssGuid() throws Exception {
        RssItem rssItem = buildBasicRssItem();
        rssItem.setRssGuid(new RssGuid("someguid", false));
        rssItem.setComments("http://indexer.com/123/detailsfromcomments#comments");

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getDetails(), is("http://indexer.com/123/detailsfromcomments"));
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
        baseConfig.getSearching().setRemoveLanguage(true);
        RssItem rssItem = buildBasicRssItem();
        rssItem.setTitle("Some title English");

        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title"));
    }

    @Test
    public void shouldRemoveObfuscatedFromNzbGeek() throws Exception {
        baseConfig.getSearching().setRemoveObfuscated(true);
        testee.config.setHost("nzbgeek");
        RssItem rssItem = buildBasicRssItem();
        rssItem.setTitle("Some title -Obfuscated");

        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title "));
    }

    @Test
    public void shouldReturnNfoFromRaw() throws Exception {
        doReturn("rawnfo").when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));

        NfoResult nfo = testee.getNfo("guid");

        assertThat(nfo.getContent(), is("rawnfo"));
        assertThat(nfo.isSuccessful(), is(true));
        assertThat(nfo.isHasNfo(), is(true));
    }

    @Test
    public void shouldParseXml() throws Exception {
        doReturn("<?xml foobar").when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));
        RssItem nfoItem = new RssItem();
        nfoItem.setDescription("nfoInXml");
        RssChannel rssChannel = new RssChannel();
        rssChannel.getItems().add(nfoItem);
        RssRoot rssRoot = new RssRoot();
        rssRoot.setRssChannel(rssChannel);
        rssChannel.setNewznabResponse(new NewznabResponse(0, 1));
        when(unmarshallerMock.unmarshal(any())).thenReturn(rssRoot);

        NfoResult nfo = testee.getNfo("guid");

        assertThat(nfo.getContent(), is("nfoInXml"));
        assertThat(nfo.isSuccessful(), is(true));
        assertThat(nfo.isHasNfo(), is(true));

        rssChannel.setNewznabResponse(new NewznabResponse(0, 0));
        nfo = testee.getNfo("guid");
        assertThat(nfo.isHasNfo(), is(false));
        assertThat(nfo.isSuccessful(), is(true));
    }

    @Test
    public void shouldCatchException() throws Exception {
        doReturn("rawnfo").when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));
        doThrow(new IndexerAccessException("message")).when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));

        NfoResult nfo = testee.getNfo("guid");

        assertThat(nfo.getContent(), is("message"));
        assertThat(nfo.isSuccessful(), is(false));
        assertThat(nfo.isHasNfo(), is(false));
    }


}