package org.nzbhydra.indexers;

import com.google.common.collect.Lists;
import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.mapping.newznab.xml.*;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.CoreMatchers.*;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@SuppressWarnings("ALL")
public class TorznabTest {

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
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private UriComponentsBuilder uriComponentsBuilderMock;
    @Captor
    private ArgumentCaptor<String> errorMessageCaptor;
    @Captor
    private ArgumentCaptor<Boolean> disabledPermanentlyCaptor;
    @Captor
    private ArgumentCaptor<? extends IndexerAccessResult> indexerApiAccessResultCaptor;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private SearchingConfig searchingConfigMock;
    @Mock
    private Category categoryMock;

    @InjectMocks
    private Torznab testee = new Torznab();


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = spy(testee);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(IdType.TMDB, IdType.TVRAGE));
        testee.config.setHost("http://127.0.0.1:1234");

        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.NONE);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
    }


    @Test
    public void shouldCreateSearchResultItem() throws Exception {
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.setSize(456L);
        rssItem.getTorznabAttributes().add(new NewznabAttribute("password", "0"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("group", "group"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("poster", "poster"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("size", "456"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("files", "10"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("grabs", "20"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("comments", "30"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("usenetdate", new JaxbPubdateAdapter().marshal(Instant.ofEpochSecond(6666666))));
        rssItem.getEnclosures().add(new NewznabXmlEnclosure("http://indexer.com/abc", 1L, "application/x-bittorrent"));
        rssItem.setCategory("4000");

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getLink(), is("http://indexer.com/abc"));
        assertThat(item.getIndexerGuid(), is("http://indexer.com/123"));
        assertThat(item.getSize(), is(456L));
        assertThat(item.getCommentsLink(), is("http://indexer.com/123/details#comments"));
        assertThat(item.getDetails(), is("http://indexer.com/123"));
        assertThat(item.isAgePrecise(), is(true));
        assertThat(item.getGrabs(), is(20));
        assertThat(item.getDownloadType(), is(DownloadType.TORRENT));
    }


    @Test
    public void shouldComputeCategory() throws Exception {
        when(categoryProviderMock.fromResultNewznabCategories(ArgumentMatchers.any())).thenReturn(categoryMock);
        NewznabXmlItem rssItem = buildBasicRssItem();
        rssItem.getTorznabAttributes().add(new NewznabAttribute("category", "5070"));
        rssItem.getEnclosures().add(new NewznabXmlEnclosure("url", 1L, "application/x-bittorrent"));

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getCategory(), is(categoryMock));

        rssItem.getTorznabAttributes().clear();
        rssItem.setCategory("5070");
        item = testee.createSearchResultItem(rssItem);
        assertThat(item.getCategory(), is(categoryMock));


    }

    private NewznabXmlItem buildBasicRssItem() {
        NewznabXmlItem rssItem = new NewznabXmlItem();
        rssItem.setLink("http://indexer.com/123");
        rssItem.setRssGuid(new NewznabXmlGuid("http://indexer.com/123", false));
        rssItem.setTitle("title");
        rssItem.setEnclosure(new NewznabXmlEnclosure("http://indexer.com/123456", 456L, "application/x-nzb"));
        rssItem.setPubDate(Instant.ofEpochSecond(5555555));
        rssItem.setDescription("description");
        rssItem.setComments("http://indexer.com/123/details#comments");
        rssItem.setTorznabAttributes(new ArrayList<>());
        return rssItem;
    }

    @Test
    public void shouldNotAddExcludedWordsToQuery() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setForbiddenWords(Arrays.asList("notthis", "alsonotthis"));
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.toUriString(), not(containsString("notthis")));
    }

    @Test
    public void shouldGetCorrectCategoryNumber() {
        NewznabXmlItem item = buildBasicRssItem();

        item.setTorznabAttributes(Collections.singletonList(new NewznabAttribute("category", "2000")));
        List<Integer> integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size(), is(1));
        assertThat(integers.get(0), is(2000));

        item.setTorznabAttributes(Collections.singletonList(new NewznabAttribute("category", "10000")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size(), is(1));
        assertThat(integers.get(0), is(10000));

        item.setTorznabAttributes(Arrays.asList(new NewznabAttribute("category", "2000"), new NewznabAttribute("category", "10000")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size(), is(1));
        assertThat(integers.get(0), is(2000));

        item.setTorznabAttributes(Arrays.asList(new NewznabAttribute("category", "2000"), new NewznabAttribute("category", "2040")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size(), is(2));
        assertThat(integers.get(0), is(2000));
        assertThat(integers.get(1), is(2040));

        item.setTorznabAttributes(Arrays.asList(new NewznabAttribute("category", "2000"), new NewznabAttribute("category", "2040"), new NewznabAttribute("category", "10000")));
        integers = testee.tryAndGetCategoryAsNumber(item);
        assertThat(integers.size(), is(2));
        assertThat(integers.get(0), is(2000));
        assertThat(integers.get(1), is(2040));
    }


}