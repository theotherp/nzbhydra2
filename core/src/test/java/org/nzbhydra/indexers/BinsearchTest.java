package org.nzbhydra.indexers;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import dev.failsafe.FailsafeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchSource;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("ConstantConditions")
public class BinsearchTest {

    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    BaseConfig baseConfig = new BaseConfig();
    @Captor
    private ArgumentCaptor<URI> uriCaptor;
    @Mock
    private QueryGenerator queryGeneratorMock;

    @InjectMocks
    private Binsearch testee = new Binsearch(configProviderMock, null, null, null, null, null,
        null, null, categoryProviderMock, null, null, queryGeneratorMock, null, null);

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        testee.config = new IndexerConfig();
        testee.config.setName("binsearch");
        testee.config.setHost("https://www.binsearch.info");

        when(queryGeneratorMock.generateQueryIfApplicable(any(), any(), any())).thenAnswer((Answer<String>) invocation -> {
            final SearchRequest searchRequest = invocation.getArgument(0);
            if (searchRequest.getQuery().isPresent()) {
                return searchRequest.getQuery().get();
            }
            return invocation.getArgument(1);
        });
    }

    @Test
    void shouldParseResultsCorrectly() throws Exception {
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html, new SearchRequest());
        assertThat(searchResultItems.size()).isEqualTo(1);
        SearchResultItem item = searchResultItems.get(0);
        assertThat(item.getTitle()).isEqualTo("testtitle. 3D.TOPBOT.TrueFrench.1080p.X264.AC3.5.1-JKF.mkv");
        assertThat(item.getLink()).isEqualTo("https://www.binsearch.info/?action=nzb&176073735=1");
        assertThat(item.getDetails()).isEqualTo("https://www.binsearch.info/?b=testtitle1.3D.TOPBOT.TrueFrench.1080p.X264.A&g=alt.binaries.movies.mkv&p=Ramer%40marmer.com+%28Clown_nez%29&max=250");
        assertThat(item.getSize()).isEqualTo(12209999872L); //12.21 GB = 12.21 * 1000*1000*1000
        assertThat(item.getIndexerGuid()).isEqualTo("176073735");
        assertThat(item.getPubDate()).isEqualTo(Instant.ofEpochSecond(1443312000));
        assertThat(item.isAgePrecise()).isEqualTo(false);
        assertThat(item.getPoster().get()).isEqualTo("Ramer@marmer.com (Clown_nez)");
        assertThat(item.getGroup().get()).isEqualTo("alt.binaries.movies.mkv");
    }

    @Test
    void shouldParseOtherResultsCorrectly() throws Exception {
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_randm.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html, new SearchRequest());
        assertThat(searchResultItems.size()).isEqualTo(41);
    }

    @Test
    void shouldRecognizeIfSingleResultPage() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_singlepage.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        List<SearchResultItem> items = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            SearchResultItem searchResultItem = new SearchResultItem();
            searchResultItem.setPubDate(Instant.now());
            items.add(searchResultItem);
        }
        indexerSearchResult.setSearchResultItems(items);
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 0, 100);
        assertThat(indexerSearchResult.getOffset()).isEqualTo(0);
        assertThat(indexerSearchResult.getPageSize()).isEqualTo(100);
        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(24);
        assertThat(indexerSearchResult.isTotalResultsKnown()).isEqualTo(true);
        assertThat(indexerSearchResult.isHasMoreResults()).isEqualTo(false);
    }


    @Test
    void shouldRecognizeIfMoreResultsAvailable() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 0, 100);
        assertThat(indexerSearchResult.isTotalResultsKnown()).isEqualTo(false);
        assertThat(indexerSearchResult.isHasMoreResults()).isEqualTo(true);
    }

    @Test
    void shouldRecognizeWhenNoResultsFound() throws Exception {
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_noresults.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html, new SearchRequest());
        assertThat(searchResultItems).isEmpty();
    }

    @Test
    void shouldBuildSimpleQuery() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.toUriString()).isEqualTo("https://www.binsearch.info/?adv_col=on&postdate=date&adv_sort=date&min=0&max=100&q=query");
    }

    @Test
    void shouldAddRequiredWords() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Arrays.asList("a", "b"));
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.build().toString()).isEqualTo("https://www.binsearch.info/?adv_col=on&postdate=date&adv_sort=date&min=0&max=100&q=query a b");
    }

    @Test
    void shouldAbortIfSearchNotPossible() throws IndexerSearchAbortedException {
        assertThrows(IndexerSearchAbortedException.class, () -> {
            SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
            testee.buildSearchUrl(searchRequest, 0, 100);
        });
    }

    @Test
    void shouldGetAndParseNfo() throws Exception {
        String nfoHtml = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_nfo.html"), Charsets.UTF_8);
        testee = spy(testee);
        doReturn(nfoHtml).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());

        NfoResult nfoResult = testee.getNfo("1234");

        assertThat(nfoResult.isHasNfo()).isEqualTo(true);
        assertThat(nfoResult.getContent()).isEqualTo("nfocontent");
        assertThat(uriCaptor.getValue().toString()).isEqualTo("https://www.binsearch.info/viewNFO.php?oid=1234");
    }

    @Test
    void shouldRetryOn503() throws Exception {
        assertThrows(FailsafeException.class, () -> {
            testee = spy(testee);
//        doReturn(nfoHtml).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());
            doThrow(new IndexerAccessException("503")).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());

            testee.getAndStoreResultToDatabase(null, IndexerApiAccessType.NFO);

        });

    }


}
