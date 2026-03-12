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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerSearchAbortedException;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("ConstantConditions")
@MockitoSettings(strictness = Strictness.LENIENT)
public class BinsearchTest {

    BaseConfig baseConfig = new BaseConfig();
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    @Captor
    private ArgumentCaptor<URI> uriCaptor;
    @Mock
    private QueryGenerator queryGeneratorMock;

    @InjectMocks
    private Binsearch testee;

    @BeforeEach
    public void setUp() throws Exception {
        Binsearch.clock = Clock.fixed(Instant.ofEpochSecond(1707391628L), ZoneId.of("UTC"));

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
        assertThat(searchResultItems).hasSize(1);
        SearchResultItem item = searchResultItems.get(0);
        assertThat(item.getTitle()).isEqualTo("Some.Title");
        assertThat(item.getIndexerGuid()).isEqualTo("abc123");
        assertThat(item.getLink()).isEqualTo("https://binsearch.info/nzb?mode=files&abc123=on&name=Some.Title.mkv.nzb");
        assertThat(item.getDetails()).isEqualTo("https://binsearch.info/details/abc123");
        assertThat(item.getSize()).isEqualTo(1460000000L);
        assertThat(item.isAgePrecise()).isFalse();
        assertThat(item.getGroup().get()).isEqualTo("alt.binaries.test");
        assertThat(item.getPoster().get()).isEqualTo("poster@usenet.net");
    }

    @Test
    void shouldRecognizeIfMoreResultsAvailable() throws Exception {
        // binsearch.html has totalElements=265, totalPages=11
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        indexerSearchResult.setSearchResultItems(createDummyItems(1));
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 0, 100);
        assertThat(indexerSearchResult.isHasMoreResults()).isTrue();
        assertThat(indexerSearchResult.isTotalResultsKnown()).isTrue();
        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(265);
        assertThat(indexerSearchResult.getPageSize()).isEqualTo(25);
        assertThat(indexerSearchResult.getOffset()).isEqualTo(0);
    }

    @Test
    void shouldRecognizeNoMoreResultsOnLastPage() throws Exception {
        // binsearch_nomoreresultsonpage17.html has totalElements=408, totalPages=17
        // Page 16 (0-indexed) = offset 400
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_nomoreresultsonpage17.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        indexerSearchResult.setSearchResultItems(createDummyItems(8));
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 400, 100);
        assertThat(indexerSearchResult.isHasMoreResults()).isFalse();
        assertThat(indexerSearchResult.isTotalResultsKnown()).isTrue();
        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(408);
        assertThat(indexerSearchResult.getPageSize()).isEqualTo(25);
        assertThat(indexerSearchResult.getOffset()).isEqualTo(400);
    }

    @Test
    void shouldFallBackToItemCountWhenNoStatsAvailable() throws Exception {
        // HTML without any embedded stats JSON should fall back to item count
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = "<html><body>no stats here</body></html>";
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        indexerSearchResult.setSearchResultItems(createDummyItems(4));
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 0, 100);
        assertThat(indexerSearchResult.isHasMoreResults()).isFalse();
        assertThat(indexerSearchResult.isTotalResultsKnown()).isTrue();
        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(4);
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
        assertThat(builder.toUriString()).isEqualTo("https://www.binsearch.info/?q=query");
    }

    @Test
    void shouldAddRequiredWords() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Arrays.asList("a", "b"));
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.build().toString()).isEqualTo("https://www.binsearch.info/?q=query a b");
    }

    @Test
    void shouldAbortIfSearchNotPossible() {
        assertThrows(IndexerSearchAbortedException.class, () -> {
            SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
            testee.buildSearchUrl(searchRequest, 0, 100);
        });
    }

    @Test
    void shouldAddPageParameterForPagination() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        // Offset 25 = page 1, offset 50 = page 2 (0-indexed, page size 25)
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 25, 100);
        assertThat(builder.toUriString()).isEqualTo("https://www.binsearch.info/?q=query&p=1");

        builder = testee.buildSearchUrl(searchRequest, 50, 100);
        assertThat(builder.toUriString()).isEqualTo("https://www.binsearch.info/?q=query&p=2");
    }

    @Test
    void shouldGetAndParseNfo() throws Exception {
        String nfoHtml = Resources.toString(Resources.getResource(BinsearchTest.class, "/org/nzbhydra/mapping/binsearch_nfo.html"), Charsets.UTF_8);
        testee = spy(testee);
        doReturn(nfoHtml).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());

        NfoResult nfoResult = testee.getNfo("1234");

        assertThat(nfoResult.isHasNfo()).isTrue();
        assertThat(nfoResult.getContent()).isEqualTo("nfocontent");
        assertThat(uriCaptor.getValue().toString()).isEqualTo("https://www.binsearch.info/viewNFO.php?oid=1234");
    }

    @Test
    void shouldRetryOn503() {
        assertThrows(FailsafeException.class, () -> {
            testee = spy(testee);
            doThrow(new IndexerAccessException("503")).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());
            testee.getAndStoreResultToDatabase(null, IndexerApiAccessType.NFO);
        });
    }

    private List<SearchResultItem> createDummyItems(int count) {
        List<SearchResultItem> items = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            SearchResultItem item = new SearchResultItem();
            item.setPubDate(Instant.now());
            items.add(item);
        }
        return items;
    }
}
