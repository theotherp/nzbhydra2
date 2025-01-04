package org.nzbhydra.indexers;

import com.google.common.base.Stopwatch;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Lists;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.mockito.stubbing.Answer;
import org.nzbhydra.NzbHydraException;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.SubCategory;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerAuthException;
import org.nzbhydra.indexers.exceptions.IndexerErrorCodeException;
import org.nzbhydra.indexers.exceptions.IndexerProgramErrorException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.builder.RssBuilder;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.xml.JaxbPubdateAdapter;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResultAcceptor;
import org.nzbhydra.searching.SearchResultAcceptor.AcceptorResult;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.HasNfo;
import org.nzbhydra.searching.searchrequests.InternalData.FallbackState;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.oxm.Unmarshaller;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SuppressWarnings("ALL")
@MockitoSettings(strictness = Strictness.LENIENT)
public class NewznabTest {

    private BaseConfig baseConfig;
    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private IndexerWebAccess indexerWebAccessMock;

    private IndexerEntity indexerEntityMock = new IndexerEntity("indexer");
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
    @Mock
    private CustomQueryAndTitleMappingHandler customQueryAndTitleMappingHandler;
    @Mock
    private IndexerSearchResultPersistor searchResultPersistor;
    @Captor
    ArgumentCaptor<String> errorMessageCaptor;
    @Captor
    ArgumentCaptor<Boolean> disabledPermanentlyCaptor;
    @Captor
    ArgumentCaptor<? extends IndexerAccessResult> indexerApiAccessResultCaptor;
    @Mock
    BaseConfig baseConfigMock;
    @Mock
    private BaseConfigHandler baseConfigHandler;
    @Mock
    SearchingConfig searchingConfigMock;
    @Mock
    private QueryGenerator queryGeneratorMock;
    Category animeCategory = new Category("anime");
    Category naCategory = new Category("n/a");
    Category otherCategory = new Category("other");
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private NewznabCategoryComputer newznabCategoryComputer;
    @Mock
    private SearchRequestIdConverter searchRequestIdConverter;

    @InjectMocks
    private Newznab testee;


    @BeforeEach
    public void setUp() throws Exception {
        testee = spy(testee);
        when(infoProviderMock.canConvert(MediaIdType.IMDB, MediaIdType.TMDB)).thenReturn(true);
        MediaInfo info = new MediaInfo();
        info.setImdbId("imdbId");
        info.setTmdbId("tmdbId");
        info.setTvmazeId("tvmazeId");
        info.setTvrageId("tvrageId");
        info.setTvdbId("tvdbId");
        when(infoProviderMock.convert("imdbId", MediaIdType.IMDB)).thenReturn(info);

        when(infoProviderMock.convert(anyMap())).thenReturn(info);
        when(infoProviderMock.convert("tvmazeId", MediaIdType.TVMAZE)).thenReturn(info);
        //when(indexerEntityMock.getStatus()).thenReturn(indexerStatusEntityMock);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(MediaIdType.TMDB, MediaIdType.TVRAGE));
        testee.config.setHost("http://127.0.0.1:1234");
        testee.config.setForbiddenWordPrefix(IndexerConfig.ForbiddenWordPrefix.EXCLAMATION_MARK);
        testee.indexer = indexerEntityMock;
        Field field = Indexer.class.getDeclaredField("titleMapping");
        field.setAccessible(true);
        field.set(testee, customQueryAndTitleMappingHandler);

        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.NONE);
        baseConfig.getSearching().setIgnorePassworded(true);

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

        when(queryGeneratorMock.generateQueryIfApplicable(any(), any(), any())).thenAnswer(new Answer<String>() {
            @Override
            public String answer(InvocationOnMock invocation) throws Throwable {

                final SearchRequest searchRequest = (SearchRequest) invocation.getArgument(0);
                if (searchRequest.getQuery().isPresent()) {
                    return searchRequest.getQuery().get();
                }
                return invocation.getArgument(1);
            }
        });
        doAnswer(new Answer() {
            @Override
            public Void answer(InvocationOnMock invocation) throws Throwable {
                SearchResultItem item = invocation.getArgument(0);
                List<Integer> cats = invocation.getArgument(1);
                IndexerConfig config = invocation.getArgument(2);
                new NewznabCategoryComputer(categoryProviderMock).computeCategory(item, cats, config);
                return null;
            }
        }).when(newznabCategoryComputer).computeCategory(any(), any(), any());


    }

    @Test
    void shouldReturnCorrectSearchResults() throws Exception {
        NewznabXmlRoot root = RssBuilder.builder().items(Arrays.asList(RssItemBuilder.builder("title").build())).newznabResponse(0, 1).build();
        when(indexerWebAccessMock.get(any(), eq(testee.config), any())).thenReturn(root);

        IndexerSearchResult indexerSearchResult = testee.buildSearchUrlAndCall(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);

        assertThat(indexerSearchResult.getSearchResultItems().size()).isEqualTo(1);
        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(1);
        assertThat(indexerSearchResult.isHasMoreResults()).isEqualTo(false);
        assertThat(indexerSearchResult.isTotalResultsKnown()).isEqualTo(true);
    }

    @Test
    void shouldAccountForRejectedResults() throws Exception {
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

        IndexerSearchResult indexerSearchResult = testee.buildSearchUrlAndCall(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);

        assertThat(indexerSearchResult.getSearchResultItems().size()).isEqualTo(3);
        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(105);
        assertThat(indexerSearchResult.isHasMoreResults()).isEqualTo(false);
        assertThat(indexerSearchResult.isTotalResultsKnown()).isEqualTo(true);
    }

    @Test
    void shouldGetIdsIfNoneOfTheProvidedAreSupported() throws Exception {
        when(infoProviderMock.canConvertAny(anySet(), anySet())).thenReturn(true);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);

        searchRequest.getIdentifiers().put(MediaIdType.IMDB, "imdbId");
        searchRequest.getIdentifiers().put(MediaIdType.TVMAZE, "tvmazeId");
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        testee.config.getSupportedSearchIds().addAll(Arrays.asList(MediaIdType.TMDB, MediaIdType.TVRAGE, MediaIdType.TVMAZE));

        builder = testee.extendQueryUrlWithSearchIds(searchRequest, builder);

        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertThat(params.containsKey("imdbid")).isFalse();
        assertThat(params.containsKey("tmdbid")).isFalse();
        assertThat(params.containsKey("rid")).isFalse();
        assertTrue(params.containsKey("tvmazeid"));
    }

    @Test
    void shouldNotGetInfosIfAtLeastOneProvidedIsSupported() throws Exception {
        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(MediaIdType.IMDB));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(MediaIdType.IMDB, "imdbId");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryUrlWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertThat(params).hasSize(1);
        verify(infoProviderMock, never()).convert(anyString(), any(MediaIdType.class));
    }

    @Test
    void shouldRemoveTrailingTtFromImdbId() throws Exception {
        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(MediaIdType.IMDB));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(MediaIdType.IMDB, "12345");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryUrlWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertThat(params).hasSize(1);
        assertThat(params.get("imdbid").get(0)).isEqualTo("12345");
        verify(infoProviderMock, never()).convert(anyString(), any(MediaIdType.class));
    }

    //    @Test
    // TODO Move to QueryGeneratorTest
    public void shouldGenerateQueryIfNecessaryAndAllowed() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchIds(Collections.singletonList(MediaIdType.IMDB));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(MediaIdType.IMDB, "imdbId");
        when(infoProviderMock.canConvert(any(), any())).thenReturn(false);
        MediaInfo mediaInfo = new MediaInfo();
        mediaInfo.setTitle("someMovie");
        when(infoProviderMock.convert("imdbId", MediaIdType.IMDB)).thenReturn(mediaInfo);


    }

    // TODO Move to QueryGeneratorTest
//    @Test
    public void shouldGenerateQueryIfFallbackRequested() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setName("indexer");
        testee.config.setSupportedSearchIds(Arrays.asList(MediaIdType.TVDB));
        testee.config.setSupportedSearchTypes(Arrays.asList(ActionAttribute.TVSEARCH, ActionAttribute.SEARCH));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.TVSEARCH, 0, 100);
        searchRequest.getInternalData().setFallbackStateByIndexer("indexer", FallbackState.REQUESTED);
        searchRequest.getIdentifiers().put(MediaIdType.TVDB, "tvdbId");
        when(infoProviderMock.canConvert(any(), any())).thenReturn(false);
        MediaInfo mediaInfo = new MediaInfo();
        mediaInfo.setTitle("someShow");
        when(infoProviderMock.convert("tvdbId", MediaIdType.TVDB)).thenReturn(mediaInfo);

        assertThat(testee.generateQueryIfApplicable(searchRequest, "")).isEqualTo("someShow");

        //Don't add season/episode for fallback queries
        searchRequest.getInternalData().setFallbackStateByIndexer("indexer", FallbackState.REQUESTED);
        searchRequest.setSeason(1);
        searchRequest.setEpisode("1");
        assertThat(testee.generateQueryIfApplicable(searchRequest, "")).isEqualTo("someShow");
    }

    // TODO Move to QueryGeneratorTest
//    @Test
    public void shouldGenerateQueryIfBookSearchTypeNotSupported() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchIds(Collections.emptyList());
        testee.config.setSupportedSearchTypes(Collections.emptyList());
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.BOOK, 0, 100);
        searchRequest.setAuthor("author");
        searchRequest.setTitle("title");

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?t=search&extended=1&q=title author").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    @Test
    void shouldUseAuthorAndTitleIfBookSearchSupported() throws Exception {
        testee.config = new IndexerConfig();
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);
        testee.config.setHost("http://www.indexer.com");
        testee.config.setSupportedSearchTypes(Arrays.asList(ActionAttribute.BOOK));
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.BOOK, 0, 100);
        searchRequest.setAuthor("author");
        searchRequest.setTitle("title");

        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.indexer.com/api?t=book&extended=1&title=title&author=author&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    private UriComponentsBuilder buildCleanedSearchUrl(SearchRequest searchRequest, Integer offset, Integer limit) throws IndexerSearchAbortedException {
        return testee.buildSearchUrl(searchRequest, offset, limit).replaceQueryParam("password").replaceQueryParam("pw");
    }

    @Test
    void shouldThrowAuthException() throws Exception {
        assertThrows(IndexerAuthException.class, () -> {
            doReturn(new NewznabXmlError("101", "Wrong API key")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
            doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

            testee.buildSearchUrlAndCall(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
        });
    }

    @Test
    void shouldThrowErrorCodeWhen100ApiHitLimits() throws Exception {
        assertThrows(IndexerErrorCodeException.class, () -> {
            doReturn(new NewznabXmlError("100", "Daily Hits Limit Reached\"")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
            doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

            testee.buildSearchUrlAndCall(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
        });
    }


    @Test
    void shouldThrowProgramErrorCodeException() throws Exception {
        assertThrows(IndexerProgramErrorException.class, () -> {
            doReturn(new NewznabXmlError("200", "Whatever")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
            doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

            testee.buildSearchUrlAndCall(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
        });
    }

    @Test
    void shouldThrowErrorCodeThatsNotMyFaultException() throws Exception {
        assertThrows(IndexerErrorCodeException.class, () -> {
            doReturn(new NewznabXmlError("123", "Whatever")).when(testee).getAndStoreResultToDatabase(any(), eq(Xml.class), eq(IndexerApiAccessType.SEARCH));
            doNothing().when(testee).handleFailure(errorMessageCaptor.capture(), disabledPermanentlyCaptor.capture(), any(IndexerApiAccessType.class), any(), indexerApiAccessResultCaptor.capture());

            testee.buildSearchUrlAndCall(new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100), 0, 100);
        });
    }

    @Test
    void shouldConvertIdIfNecessary() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(MediaIdType.IMDB, "imdbId");
        testee.config.getSupportedSearchIds().add(MediaIdType.TMDB);
        when(infoProviderMock.canConvertAny(anySet(), anySet())).thenReturn(true);
        doAnswer(new Answer() {
            @Override
            public Void answer(InvocationOnMock invocation) throws Throwable {
                SearchRequest request = invocation.getArgument(0);
                IndexerConfig config = invocation.getArgument(1);
                new SearchRequestIdConverter(configProviderMock, infoProviderMock).convertSearchIdsIfNeeded(request, config);
                return null;
            }
        }).when(searchRequestIdConverter).convertSearchIdsIfNeeded(any(), any());
        testee.extendQueryUrlWithSearchIds(searchRequest, uriComponentsBuilderMock);

        verify(uriComponentsBuilderMock).queryParam("tmdbid", "tmdbId");
    }

    @Test
    void shouldNotConvertIdIfNotNecessary() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(MediaIdType.TMDB, "tmdbId");

        testee.extendQueryUrlWithSearchIds(searchRequest, uriComponentsBuilderMock);

        verify(infoProviderMock, never()).convert(anyString(), eq(MediaIdType.TMDB));
    }

    @Test
    void shouldAddExcludedAndRequiredWordsToQuery() throws Exception {
        testee.config.setForbiddenWordPrefix(IndexerConfig.ForbiddenWordPrefix.DOUBLE_DASH);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q --a --b --c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=aquery --a --b --c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        searchRequest.getInternalData().setRequiredWords(Lists.newArrayList("x", "y", "z"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q x y z --a --b --c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());

        searchRequest.getCategory().getForbiddenWords().add("catforbidden");
        searchRequest.getCategory().getRequiredWords().add("catrequired");
        baseConfig.getSearching().setForbiddenWords(Lists.newArrayList("globalforbidden"));
        baseConfig.getSearching().setRequiredWords(Lists.newArrayList("globalrequired"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q x y z globalrequired catrequired --a --b --c --globalforbidden --catforbidden&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    @Test
    void shoulNotdAddExcludedAndRequiredWordsWithSomeCharacters() throws Exception {
        testee.config.setForbiddenWordPrefix(IndexerConfig.ForbiddenWordPrefix.DOUBLE_DASH);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b b", "-c", "d.d"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q --a&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    @Test
    void shoulNotdAddExcludedWordsWithExclamationMark() throws Exception {
        testee.config.setForbiddenWordPrefix(IndexerConfig.ForbiddenWordPrefix.EXCLAMATION_MARK);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b b", "-c", "d.d"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q !a&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    @Test
    void shouldUseDifferentExclusionFormatForNzedbAndOmgWtf() throws Exception {
        testee.config.setBackend(BackendType.NZEDB);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=q !a,!b,!c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&q=aquery !a,!b,!c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());

        testee.config.setBackend(BackendType.NEWZNAB);
        testee.config.setHost("http://www.OMGwtfnzbs.com");
        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("q");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?t=search&extended=1&q=q !a,!b,!c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());

        searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("aquery");
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://www.OMGwtfnzbs.com/api?t=search&extended=1&q=aquery !a,!b,!c&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    @Test
    void shouldNotAddForbiddenWordsToEmptyQuery() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setForbiddenWords(Lists.newArrayList("a", "b", "c"));
        assertEquals(UriComponentsBuilder.fromHttpUrl("http://127.0.0.1:1234/api?t=search&extended=1&limit=1000").build(), buildCleanedSearchUrl(searchRequest, null, null).build());
    }

    @Test
    void shouldCreateSearchResultItem() throws Exception {
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
        assertThat(item.getLink()).isEqualTo("http://indexer.com/nzb/123");
        assertThat(item.getIndexerGuid()).isEqualTo("123");
        assertThat(item.getSize()).isEqualTo(456L);
        assertThat(item.getDescription()).isEqualTo("description");
        assertThat(item.getPubDate()).isEqualTo(Instant.ofEpochSecond(5555555));
        assertThat(item.getCommentsLink()).isEqualTo("http://indexer.com/details/123x#comments");
        assertThat(item.getDetails()).isEqualTo("http://indexer.com/details/123");
        assertThat(item.isAgePrecise()).isEqualTo(true);
        assertThat(item.getUsenetDate().get()).isEqualTo(Instant.ofEpochSecond(6666666));
        assertThat(item.getDownloadType()).isEqualTo(DownloadType.NZB);

        assertThat(item.isPassworded()).isEqualTo(false);
        assertThat(item.getGroup().get()).isEqualTo("group");
        assertThat(item.getPoster().get()).isEqualTo("poster");
        assertThat(item.getFiles()).isEqualTo(10);
        assertThat(item.getGrabs()).isEqualTo(20);
        assertThat(item.getCommentsCount()).isEqualTo(30);
        verify(categoryProviderMock, times(1)).fromResultNewznabCategories(Arrays.asList(5000, 5050));

        rssItem.setRssGuid(new NewznabXmlGuid("123", false));
        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("password", "1"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("nfo", "1"));
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("123");
        assertThat(item.isPassworded()).isEqualTo(true);
        assertThat(item.getHasNfo()).isEqualTo(HasNfo.YES);
    }

    @Test
    public void shouldParseGuid() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getRssGuid().setPermaLink(false);
        rssItem.getRssGuid().setGuid("123abc");
        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("123abc");

        rssItem.getRssGuid().setPermaLink(true);
        rssItem.getRssGuid().setGuid("https://hello.com/details?id=123abc");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("123abc");

        rssItem.getRssGuid().setGuid("https://newztown.co.za/details/123abc");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("123abc");

        rssItem.getRssGuid().setGuid("https://newztown.co.za/details/123abc#details");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("123abc");

        rssItem.getRssGuid().setGuid("https://nzbfinder.ws/details/1db2ba7c-0605-4a98-9c56-71da12cbd18c");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("1db2ba7c-0605-4a98-9c56-71da12cbd18c");

        rssItem.getRssGuid().setGuid("https://nzbgeek.info/geekseek.php?guid=66a34818a38ae8aea3dd77e828dae05b");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("66a34818a38ae8aea3dd77e828dae05b");

        rssItem.getRssGuid().setGuid("https://www.tabula-rasa.pw/details/552aeb3c-6617-4741-9218-f15012b7d21c");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getIndexerGuid()).isEqualTo("552aeb3c-6617-4741-9218-f15012b7d21c");
    }

    @Test
    public void shouldPerformance() throws Exception {

        for (int i = 0; i < 1000; i++) {
            parse();
        }
        final Stopwatch stopwatch = Stopwatch.createStarted();
        for (int i = 0; i < 5000; i++) {
            parse();
        }
        System.out.println(stopwatch.elapsed());

    }

    private void parse() throws NzbHydraException {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getRssGuid().setPermaLink(false);
        rssItem.getRssGuid().setGuid("123abc");
        SearchResultItem item = testee.createSearchResultItem(rssItem);


        rssItem.getRssGuid().setPermaLink(true);
        rssItem.getRssGuid().setGuid("https://hello.com/details?id=123abc");
        item = testee.createSearchResultItem(rssItem);

        rssItem.getRssGuid().setGuid("https://newztown.co.za/details/123abc");
        item = testee.createSearchResultItem(rssItem);

        rssItem.getRssGuid().setGuid("https://newztown.co.za/details/123abc#details");
        item = testee.createSearchResultItem(rssItem);

        rssItem.getRssGuid().setGuid("https://nzbfinder.ws/details/1db2ba7c-0605-4a98-9c56-71da12cbd18c");
        item = testee.createSearchResultItem(rssItem);

        rssItem.getRssGuid().setGuid("https://nzbgeek.info/geekseek.php?guid=66a34818a38ae8aea3dd77e828dae05b");
        item = testee.createSearchResultItem(rssItem);

        rssItem.getRssGuid().setGuid("https://www.tabula-rasa.pw/details/552aeb3c-6617-4741-9218-f15012b7d21c");
        item = testee.createSearchResultItem(rssItem);
    }

    @Test
    void shouldUseIndexersCategoryMappingToBuildOriginalCategoryName() throws Exception {
        testee.config.getCategoryMapping().setCategories(Arrays.asList(new MainCategory(5000, "TV", Arrays.asList(new SubCategory(5040, "HD")))));
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5040"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "5000"));
        SearchResultItem searchResultItem = new SearchResultItem();
        Category category = new Category();
        category.setSearchType(SearchType.TVSEARCH);
        searchResultItem.setCategory(category);

        testee.parseAttributes(rssItem, searchResultItem);
        assertThat(searchResultItem.getOriginalCategory()).isEqualTo("TV HD");

        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("category", "1234"));
        testee.parseAttributes(rssItem, searchResultItem);
        assertThat(searchResultItem.getOriginalCategory()).isEqualTo("N/A");

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
    void shouldGetDetailsLinkFromRssGuidIfPermalink() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setRssGuid(new NewznabXmlGuid("detailsLink", true));
        rssItem.setComments("http://indexer.com/123/detailsfromcomments#comments");

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getDetails()).isEqualTo("detailsLink");
    }

    @Test
    void shouldGetDetailsLinkFromCommentsIfNotSetFromRssGuid() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setRssGuid(new NewznabXmlGuid("someguid", false));
        rssItem.setComments("http://indexer.com/123/detailsfromcomments#comments");

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getDetails()).isEqualTo("http://indexer.com/123/detailsfromcomments");
    }

    @Test
    void shouldNotSetGroupOrPosterIfNotAvailable() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getNewznabAttributes().clear();
        rssItem.getNewznabAttributes().add(new NewznabAttribute("group", "not available"));
        rssItem.getNewznabAttributes().add(new NewznabAttribute("poster", "not available"));

        SearchResultItem item = testee.createSearchResultItem(rssItem);

        assertThat(item.getGroup().isPresent()).isEqualTo(false);
        assertThat(item.getPoster().isPresent()).isEqualTo(false);
    }

    @Test
    void shouldReadGroupFromDescription() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setDescription("<b>Group:</b> alt.binaries.tun<br />");

        assertThat(testee.createSearchResultItem(rssItem).getGroup().get()).isEqualTo("alt.binaries.tun");
    }

    @Test
    void shouldRemoveTrailingWords() throws Exception {
        baseConfig.getSearching().setRemoveTrailing(Arrays.asList("English", "-Obfuscated", " spanish"));
        NewznabXmlItem rssItem = buildBasicRssItem();

        rssItem.setTitle("Some title English");
        assertThat(testee.createSearchResultItem(rssItem).getTitle()).isEqualTo("Some title");

        rssItem.setTitle("Some title-Obfuscated");
        assertThat(testee.createSearchResultItem(rssItem).getTitle()).isEqualTo("Some title");

        rssItem.setTitle("Some title Spanish");
        assertThat(testee.createSearchResultItem(rssItem).getTitle()).isEqualTo("Some title");
    }


    @Test
    void shouldReturnNfoFromRaw() throws Exception {
        doReturn("rawnfo").when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));

        NfoResult nfo = testee.getNfo("guid");

        assertThat(nfo.getContent()).isEqualTo("rawnfo");
        assertThat(nfo.isSuccessful()).isEqualTo(true);
        assertThat(nfo.isHasNfo()).isEqualTo(true);
    }

    @Test
    void shouldParseXml() throws Exception {
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

        assertThat(nfo.getContent()).isEqualTo("nfoInXml");
        assertThat(nfo.isSuccessful()).isEqualTo(true);
        assertThat(nfo.isHasNfo()).isEqualTo(true);

        rssChannel.setNewznabResponse(new NewznabXmlResponse(0, 0));
        nfo = testee.getNfo("guid");
        assertThat(nfo.isHasNfo()).isEqualTo(false);
        assertThat(nfo.isSuccessful()).isEqualTo(true);
    }

    @Test
    void shouldCatchException() throws Exception {
        doReturn("rawnfo").when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));
        doThrow(new IndexerAccessException("message")).when(testee).getAndStoreResultToDatabase(any(), eq(String.class), eq(IndexerApiAccessType.NFO));

        NfoResult nfo = testee.getNfo("guid");

        assertThat(nfo.getContent()).isEqualTo("message");
        assertThat(nfo.isSuccessful()).isEqualTo(false);
        assertThat(nfo.isHasNfo()).isEqualTo(false);
    }

    @Test
    void shouldBuildCorrectSearchUrl() throws Exception {
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String uri = buildCleanedSearchUrl(request, 0, 100).toUriString();
        assertThat(uri).isEqualTo("http://127.0.0.1:1234/api?t=search&extended=1&limit=1000&offset=0");

        otherCategory.setNewznabCategories(Collections.singletonList(Arrays.asList(2000)));
        request.setCategory(otherCategory);
        uri = buildCleanedSearchUrl(request, 0, 100).toUriString();
        assertThat(uri).isEqualTo("http://127.0.0.1:1234/api?t=search&extended=1&cat=2000&limit=1000&offset=0");

        otherCategory.setNewznabCategories(Arrays.asList(Collections.singletonList(2030), Collections.singletonList(2040)));
        request.setCategory(otherCategory);
        uri = buildCleanedSearchUrl(request, 0, 100).toUriString();
        assertThat(uri).isEqualTo("http://127.0.0.1:1234/api?t=search&extended=1&cat=2030,2040&limit=1000&offset=0");

        otherCategory.setNewznabCategories(Arrays.asList(Arrays.asList(2030, 10_000), Collections.singletonList(2040)));
        request.setCategory(otherCategory);
        uri = buildCleanedSearchUrl(request, 0, 100).toUriString();
        assertThat(uri).isEqualTo("http://127.0.0.1:1234/api?t=search&extended=1&cat=2030,2040,10000&limit=1000&offset=0");

        animeCategory.setSubtype(Subtype.ANIME);
        request.setCategory(animeCategory);
        testee.getConfig().getCategoryMapping().setAnime(9090);
        uri = buildCleanedSearchUrl(request, 0, 100).toUriString();
        assertThat(uri).isEqualTo("http://127.0.0.1:1234/api?t=search&extended=1&cat=9090&limit=1000&offset=0");
    }

    @Test
    void shouldNotUseMovieWithoutIdentifiers() throws Exception {
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.MOVIE, 0, 100);
        String uri = buildCleanedSearchUrl(request, null, null).toUriString();
        assertThat(uri).contains("t=search");

        request = new SearchRequest(SearchSource.INTERNAL, SearchType.MOVIE, 0, 100);
        request.getIdentifiers().put(MediaIdType.IMDB, "123");
        testee.config.getSupportedSearchIds().add(MediaIdType.IMDB);
        testee.config.getSupportedSearchTypes().add(ActionAttribute.MOVIE);
        uri = buildCleanedSearchUrl(request, null, null).toUriString();
        assertThat(uri).contains("t=movie");
        assertThat(uri).contains("imdbid=123");
    }

}
