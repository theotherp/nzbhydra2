package org.nzbhydra.indexers;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.IndexerSearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@SuppressWarnings("ConstantConditions")
public class BinsearchTest {

    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    BaseConfig baseConfig = new BaseConfig();
    @Captor
    private ArgumentCaptor<URI> uriCaptor;

    @InjectMocks
    private Binsearch testee = new Binsearch();

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        testee.config = new IndexerConfig();
        testee.config.setName("binsearch");
        testee.config.setHost("https://www.binsearch.info");
    }

    @Test
    public void shouldParseResultsCorrectly() throws Exception {
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html);
        assertThat(searchResultItems.size(), is(1));
        SearchResultItem item = searchResultItems.get(0);
        assertThat(item.getTitle(), is("testtitle. 3D.TOPBOT.TrueFrench.1080p.X264.AC3.5.1-JKF.mkv"));
        assertThat(item.getLink(), is("https://www.binsearch.info/?action=nzb&176073735=1"));
        assertThat(item.getDetails(), is("https://www.binsearch.info/?b=testtitle1.3D.TOPBOT.TrueFrench.1080p.X264.A&g=alt.binaries.movies.mkv&p=Ramer%40marmer.com+%28Clown_nez%29&max=250"));
        assertThat(item.getSize(), is(12209999872L)); //12.21 GB = 12.21 * 1000*1000*1000
        assertThat(item.getIndexerGuid(), is("176073735"));
        assertThat(item.getPubDate(), is(Instant.ofEpochSecond(1443312000)));
        assertThat(item.isAgePrecise(), is(false));
        assertThat(item.getPoster().get(), is("Ramer@marmer.com (Clown_nez)"));
        assertThat(item.getGroup().get(), is("alt.binaries.movies.mkv"));
    }

    @Test
    public void shouldParseOtherResultsCorrectly() throws Exception {
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_randm.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html);
        assertThat(searchResultItems.size(), is(43));
    }

    @Test
    public void shouldRecognizeIfSingleResultPage() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 100, 100);
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_singlepage.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest);
        assertThat(indexerSearchResult.getOffset(), is(100));
        assertThat(indexerSearchResult.getLimit(), is(100));
        assertThat(indexerSearchResult.getTotalResults(), is(24));
        assertThat(indexerSearchResult.isTotalResultsKnown(), is(true));
        assertThat(indexerSearchResult.isHasMoreResults(), is(false));
    }


    @Test
    public void shouldRecognizeIfMoreResultsAvailable() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest);
        assertThat(indexerSearchResult.isTotalResultsKnown(), is(false));
        assertThat(indexerSearchResult.isHasMoreResults(), is(true));
    }

    @Test
    public void shouldRecognizeWhenNoResultsFound() throws Exception {
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_noresults.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html);
        assertThat(searchResultItems, is(empty()));
    }

    @Test
    public void shouldBuildSimpleQuery() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.toUriString(), is("https://www.binsearch.info/?adv_col=on&postdate=date&adv_sort=date&min=0&max=100&q=query"));
    }

    @Test
    public void shouldAddRequiredWords() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Arrays.asList("a", "b"));
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.build().toString(), is("https://www.binsearch.info/?adv_col=on&postdate=date&adv_sort=date&min=0&max=100&q=query a b"));
    }

    @Test(expected = IndexerSearchAbortedException.class)
    public void shouldAbortIfSearchNotPossible() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        testee.buildSearchUrl(searchRequest, 0, 100);
    }

    @Test
    public void shouldGetAndParseNfo() throws Exception {
        String nfoHtml = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_nfo.html"), Charsets.UTF_8);
        testee = spy(testee);
        doReturn(nfoHtml).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());

        NfoResult nfoResult = testee.getNfo("1234");

        assertThat(nfoResult.isHasNfo(), is(true));
        assertThat(nfoResult.getContent(), is("nfocontent"));
        assertThat(uriCaptor.getValue().toString(), is("https://www.binsearch.info/viewNFO.php?oid=1234"));
    }


}