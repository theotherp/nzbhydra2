package org.nzbhydra.indexers;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Lists;
import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.*;
import org.nzbhydra.config.Category.Subtype;
import org.nzbhydra.config.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.IndexerCategoryConfig.SubCategory;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerProgramErrorException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.builder.RssBuilder;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.xml.*;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.InternalData.FallbackState;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.oxm.Unmarshaller;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.*;

import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.eq;

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
    private CategoryProvider categoryProviderMock;
    @Mock
    private IndexerSearchRepository indexerSearchRepositoryMock;
    @Mock
    private IndexerApiAccessEntityShortRepository shortRepositoryMock;
    @Mock
    private SearchResultRepository searchResultRepositoryMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private UriComponentsBuilder uriComponentsBuilderMock;
    @Mock
    private SearchResultAcceptor resultAcceptorMock;
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
    Category animeCategory = new Category("anime");
    Category naCategory = new Category("n/a");
    Category otherCategory = new Category("other");
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

        when(infoProviderMock.convert(anyMap())).thenReturn(info);
        when(infoProviderMock.convert("tvmazeId", IdType.TVMAZE)).thenReturn(info);
        //when(indexerEntityMock.getStatus()).thenReturn(indexerStatusEntityMock);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(IdType.TMDB, IdType.TVRAGE));
        testee.config.setHost("http://127.0.0.1:1234");

        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.NONE);

        when(resultAcceptorMock.acceptResults(any(), any(), any())).thenAnswer(new Answer<AcceptorResult>() {
            @Override
            public AcceptorResult answer(InvocationOnMock invocation) throws Throwable {
                return new AcceptorResult(invocation.getArgument(0), HashMultiset.create());
            }
        });
        animeCategory.setSubtype(Subtype.ANIME);
        when(categoryProviderMock.fromSubtype(Subtype.ANIME)).thenReturn(Optional.of(animeCategory));
        when(categoryProviderMock.fromSearchNewznabCategories(any(), any())).thenAnswer(x -> x.getArgument(1));
        when(categoryProviderMock.getNotAvailable()).thenReturn(naCategory);
    }

    @Test
    public void shouldReturnCorrectSearchResults() throws Exception {
        NewznabXmlRoot root = RssBuilder.builder().items(Arrays.asList(RssItemBuilder.builder("title").build())).newznabResponse(0, 1).build();
        when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenReturn(root);

        IndexerSearchResult indexerSearchResult = testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);

        assertThat(indexerSearchResult.getSearchResultItems().size(), is(1));
        assertThat(indexerSearchResult.getTotalResults(), is(1));
        assertThat(indexerSearchResult.isHasMoreResults(), is(false));
        assertThat(indexerSearchResult.isTotalResultsKnown(), is(true));
    }

    @Test
    public void shouldAccountForRejectedResults() throws Exception {
        List<NewznabXmlItem> items = Arrays.asList(
                RssItemBuilder.builder("title1").build(),
                RssItemBuilder.builder("title2").build(),
                RssItemBuilder.builder("title3").build(),
                RssItemBuilder.builder("title4").build(),
                RssItemBuilder.builder("title5").build()
        );
        NewznabXmlRoot root = RssBuilder.builder().items(items).newznabResponse(100, 105).build();
        when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenReturn(root);

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
        when(infoProviderMock.canConvertAny(anySet(), anySet())).thenReturn(true);
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
        verify(infoProviderMock, times(1)).convert(anyMap());
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
    public void shouldRemoveTrailingTtFromImdbId() throws Exception {
        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(IdType.IMDB));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "12345");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryUrlWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertEquals(1, params.size());
        assertEquals("12345", params.get("imdbid").get(0));
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

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?t=search&extended=1&imdbid=imdbId&q=someMovie").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        //Should use title if provided
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setTitle("anotherTitle");
        UriComponents actual = testee.buildSearchUrl(searchRequest, null, null).build();
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?t=search&extended=1&q=anotherTitle").build(), actual);
    }

    @Test
    public void shouldGenerateQueryIfFallbackRequested() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchIds(Arrays.asList(IdType.TVDB));
        testee.config.setSupportedSearchTypes(Arrays.asList(ActionAttribute.TVSEARCH, ActionAttribute.SEARCH));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.TVSEARCH, 0, 100);
        searchRequest.getInternalData().setFallbackState(FallbackState.REQUESTED);
        searchRequest.getIdentifiers().put(IdType.TVDB, "tvdbId");
        when(infoProviderMock.canConvert(any(), any())).thenReturn(false);
        MediaInfo mediaInfo = new MediaInfo();
        mediaInfo.setTitle("someShow");
        when(infoProviderMock.convert("tvdbId", IdType.TVDB)).thenReturn(mediaInfo);

        assertEquals("someShow", testee.generateQueryIfApplicable(searchRequest, ""));

        //Don't add season/episode for fallback queries
        searchRequest.getInternalData().setFallbackState(FallbackState.REQUESTED);
        searchRequest.setSeason(1);
        searchRequest.setEpisode("1");
        assertEquals("someShow", testee.generateQueryIfApplicable(searchRequest, ""));
    }

    @Test
    public void shouldGenerateQueryIfBookSearchTypeNotSupported() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchIds(Collections.emptyList());
        testee.config.setSupportedSearchTypes(Collections.emptyList());
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.BOOK, 0, 100);
        searchRequest.setAuthor("author");
        searchRequest.setTitle("title");

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?t=search&extended=1&q=title author").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shouldUseAuthorAndTitleIfBookSearchSupported() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchTypes(Arrays.asList(ActionAttribute.BOOK));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.BOOK, 0, 100);
        searchRequest.setAuthor("author");
        searchRequest.setTitle("title");

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?t=book&extended=1&q=title&title=title&author=author").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test(expected = IndexerAuthException.class)
    public void shouldThrowAuthException() throws Exception {
        doReturn(new NewznabXmlError("101", "Wrong API key")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
    }

    @Test(expected = IndexerErrorCodeException.class)
    public void shouldThrowErrorCodeWhen100ApiHitLimits() throws Exception {
        doReturn(new NewznabXmlError("100", "Daily Hits Limit Reached\"")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
    }


    @Test(expected = IndexerProgramErrorException.class)
    public void shouldThrowProgramErrorCodeException() throws Exception {
        doReturn(new NewznabXmlError("200", "Whatever")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
    }

    @Test(expected = IndexerErrorCodeException.class)
    public void shouldThrowErrorCodeThatsNotMyFaultException() throws Exception {
        doReturn(new NewznabXmlError("123", "Whatever")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
        doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

        testee.searchInternal(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
    }

    @Test
    public void shouldConvertIdIfNecessary() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        testee.config.getSupportedSearchIds().add(IdType.TMDB);
        when(infoProviderMock.canConvertAny(anySet(), anySet())).thenReturn(true);

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
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q --a --b --c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=aquery --a --b --c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        searchRequest.getInternalData().setRequiredWords(Lists.newArrayList("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q x y z --a --b --c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest.getCategory().getForbiddenWords().add("catforbidden");
        searchRequest.getCategory().getRequiredWords().add("catrequired");
        baseConfig.getSearching().setForbiddenWords(Lists.newArrayList("globalforbidden"));
        baseConfig.getSearching().setRequiredWords(Lists.newArrayList("globalrequired"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q x y z globalrequired catrequired --a --b --c --globalforbidden --catforbidden").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shoulNotdAddExcludedAndRequiredWordsWithSomeCharacters() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b b", "-c", "d.d"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q --a").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shouldUseDifferentExclusionFormatForNzedbAndOmgWtf() throws Exception {
        testee.config.setBackend(BackendType.NZEDB);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q !a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=aquery !a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        testee.config.setBackend(BackendType.NEWZNAB);
        testee.config.setHost("http://www.OMGwtfnzbs.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?t=search&extended=1&q=q !a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?t=search&extended=1&q=aquery !a,!b,!c").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shouldNotAddForbiddenWordsToEmptyQuery() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1").build(), testee.buildSearchUrl(searchRequest, null, null).build());
    }

    @Test
    public void shouldCreateSearchResultItem() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("password", "0"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("group", "group"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("poster", "poster"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("files", "10"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("grabs", "20"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("comments", "30"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("usenetdate", new JaxbPubdateAdapter().marshal(Instant.ofEpochSecond(6666666))));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5000"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5050"));

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
        verify(categoryProviderMock, times(1)).fromResultNewznabCategories(Arrays.asList(5000, 5050));

        rssItem.setRssGuid(new NewznabXmlGuid("123", false));
        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("password", "1"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("nfo", "1"));
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid(), is("123"));
        assertThat(item.isPassworded(), is(true));
        assertThat(item.getHasNfo(), is(HasNfo.YES));
    }

    @Test
    public void shouldUseIndexersCategoryMappingToBuildOriginalCategoryName() throws Exception {
        testee.config.getCategoryMapping().setCategories(Arrays.asList(new MainCategory(5000, "TV", Arrays.asList(new SubCategory(5040, "HD")))));
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5040"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5000"));
        SearchResultItem searchResultItem = new SearchResultItem();

        testee.parseAttributes(rssItem, searchResultItem);
        assertThat(searchResultItem.getOriginalCategory(), is("TV HD"));

        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "1234"));
        testee.parseAttributes(rssItem, searchResultItem);
        assertThat(searchResultItem.getOriginalCategory(), is("N/A"));

    }

    private NewznabXmlItem buildBasicRssItem() {
        NewznabXmlItem rssItem = new NewznabXmlItem();
        rssItem.setLink("http://indexer.com/nzb/123");
        rssItem.setRssGuid(new NewznabXmlGuid("http://indexer.com/details/123", true));
        rssItem.setTitle("title");
        rssItem.setEnclosure(new NewznabXmlEnclosure("http://indexer.com/nzb/123", 456L, "application/x-nzb"));
        rssItem.setPubDate(Instant.ofEpochSecond(5555555));
        rssItem.setDescription("description");
        rssItem.setComments("http://indexer.com/details/123x#comments");
        rssItem.setNewznabAttributes(new ArrayList<>());
        return rssItem;
    }

    @Test
    public void shouldGetDetailsLinkFromRssGuidIfPermalink() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setRssGuid(new NewznabXmlGuid("detailsLink", true));
        rssItem.setComments("http://indexer.com/123/detailsfromcomments#comments");

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getDetails(), is("detailsLink"));
    }

    @Test
    public void shouldGetDetailsLinkFromCommentsIfNotSetFromRssGuid() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setRssGuid(new NewznabXmlGuid("someguid", false));
        rssItem.setComments("http://indexer.com/123/detailsfromcomments#comments");

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getDetails(), is("http://indexer.com/123/detailsfromcomments"));
    }

    @Test
    public void shouldNotSetGroupOrPosterIfNotAvailable() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("group", "not available"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("poster", "not available"));

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getGroup().isPresent(), is(false));
        assertThat(item.getPoster().isPresent(), is(false));
    }

    @Test
    public void shouldReadGroupFromDescription() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setDescription("<b>Group:</b> alt.binaries.tun<br />");

        assertThat(testee.createSearchResultItem(rssItem).getGroup().get(), is("alt.binaries.tun"));
    }

    @Test
    public void shouldRemoveTrailingWords() throws Exception {
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("English", "-Obfuscated", " spanish"));
        NewznabXmlItem rssItem = buildBasicRssItem();

        rssItem.setTitle("Some title English");
        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title"));

        rssItem.setTitle("Some title-Obfuscated");
        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title"));

        rssItem.setTitle("Some title Spanish");
        assertThat(testee.createSearchResultItem(rssItem).getTitle(), is("Some title"));
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
        NewznabXmlItem nfoItem = new NewznabXmlItem();
        nfoItem.setDescription("nfoInXml");
        NewznabXmlChannel rssChannel = new NewznabXmlChannel();
        rssChannel.getItems().add(nfoItem);
        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        rssRoot.setRssChannel(rssChannel);
        rssChannel.setNewznabResponse(new NewznabXmlResponse(0, 1));
        when(unmarshallerMock.unmarshal(any())).thenReturn(rssRoot);

        NfoResult nfo = testee.getNfo("guid");

        assertThat(nfo.getContent(), is("nfoInXml"));
        assertThat(nfo.isSuccessful(), is(true));
        assertThat(nfo.isHasNfo(), is(true));

        rssChannel.setNewznabResponse(new NewznabXmlResponse(0, 0));
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

    @Test
    public void shouldComputeCategory() throws Exception {
        when(categoryProviderMock.fromResultNewznabCategories(any())).thenReturn(otherCategory);
        testee.config.getCategoryMapping().setAnime(1010);
        SearchResultItem item = new SearchResultItem();

        //Found a specific mapping
        testee.computeCategory(item, Arrays.asList(1000, 1010));
        assertThat(item.getCategory(), is(animeCategory));

        //Didn't find a specific mapping, use the general one from the categories
        testee.computeCategory(item, Arrays.asList(3030));
        assertThat(item.getCategory(), is(otherCategory));
    }

    @Test
    public void shouldBuildCorrectSearchUrl() throws Exception {
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String uri = testee.buildSearchUrl(request, 0, 100).toUriString();
        assertThat(uri, is("http://127.0.0.1:1234/api?t=search&extended=1&limit=100&offset=0"));

        otherCategory.setNewznabCategories(Arrays.asList(2000));
        request.setCategory(otherCategory);
        uri = testee.buildSearchUrl(request, 0, 100).toUriString();
        assertThat(uri, is("http://127.0.0.1:1234/api?t=search&extended=1&cat=2000&limit=100&offset=0"));

        otherCategory.setNewznabCategories(Arrays.asList(2030, 2040));
        request.setCategory(otherCategory);
        uri = testee.buildSearchUrl(request, 0, 100).toUriString();
        assertThat(uri, is("http://127.0.0.1:1234/api?t=search&extended=1&cat=2030,2040&limit=100&offset=0"));

        animeCategory.setSubtype(Subtype.ANIME);
        request.setCategory(animeCategory);
        testee.getConfig().getCategoryMapping().setAnime(9090);
        uri = testee.buildSearchUrl(request, 0, 100).toUriString();
        assertThat(uri, is("http://127.0.0.1:1234/api?t=search&extended=1&cat=9090&limit=100&offset=0"));
    }

    @Test
    public void shouldNotUseMovieWithoutIdentifiers() throws Exception {
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.MOVIE, 0, 100);
        String uri = testee.buildSearchUrl(request, 0, 100).toUriString();
        assertThat(uri, containsString("t=search"));

        request = new SearchRequest(SearchSource.INTERNAL, SearchType.MOVIE, 0, 100);
        request.getIdentifiers().put(IdType.IMDB, "123");
        testee.config.getSupportedSearchIds().add(IdType.IMDB);
        testee.config.getSupportedSearchTypes().add(ActionAttribute.MOVIE);
        uri = testee.buildSearchUrl(request, 0, 100).toUriString();
        assertThat(uri, containsString("t=movie"));
        assertThat(uri, containsString("imdbid=123"));
    }

}