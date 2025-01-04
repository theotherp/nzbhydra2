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
import org.nzbhydra.mapping.AgeToPubDateConverter;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.web.util.UriComponentsBuilder;

import java.lang.reflect.Field;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
@SuppressWarnings("ConstantConditions")
@MockitoSettings(strictness = Strictness.LENIENT)
public class NzbKingTest {

    // kksLWrBiAXSBciUljS4ISqMxyqzC

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
    private NzbKing testee = new NzbKing(configProviderMock, null, null, null, null, null,
            null, null, categoryProviderMock, null, null, queryGeneratorMock, null, null, null);

    @BeforeEach
    public void setUp() throws Exception {
        Field field = AgeToPubDateConverter.class.getDeclaredField("clock");
        field.setAccessible(true);
        field.set(null, Clock.fixed(Instant.ofEpochSecond(1707391628L), ZoneId.of("UTC")));

        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        testee.config = new IndexerConfig();
        testee.config.setName("NZBKing");
        testee.config.setHost("https://www.nzbking.com/search");

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
        String html = Resources.toString(Resources.getResource(NzbKingTest.class, "/org/nzbhydra/mapping/nzbKing.html"), Charsets.UTF_8);
        SearchRequest searchRequest = new SearchRequest();
        searchRequest.setQuery("rabiata");
        searchRequest.getInternalData().setQueryWords(List.of("rabiata"));
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html, searchRequest);
        assertThat(searchResultItems.size()).isEqualTo(21);
        SearchResultItem item = searchResultItems.get(0);
        assertThat(item.getTitle()).isEqualTo("Rabiata.de.la.saga.Crazy.John.2024.2160p.WEB-DL.DDP5.1.DV.HDR.H.265-KWK");
        assertThat(item.getLink()).isEqualTo("https://www.nzbking.com/nzb:669923f04e4d6b10f89f50fb");
        assertThat(item.getDetails()).isEqualTo("https://www.nzbking.com/details:669923f04e4d6b10f89f50fb");
        assertThat(item.getSize()).isEqualTo(30064771072L);
        assertThat(item.getIndexerGuid()).isEqualTo("669923f04e4d6b10f89f50fb");
        assertThat(item.getPubDate().getEpochSecond()).isEqualTo(1705750028L);
        assertThat(item.isAgePrecise()).isEqualTo(false);
        assertThat(item.getPoster().get()).isEqualTo("PzgS9ZWRidlSO@ngPost.com");
        assertThat(item.getGroup().get()).isEqualTo("a.b.multimedia");
    }


//    @Test
//    void shouldRecognizeIfSingleResultPage() throws Exception {
//        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
//        String html = Resources.toString(Resources.getResource(NzbKingTest.class, "/org/nzbhydra/mapping/binsearch_singlepage.html"), Charsets.UTF_8);
//        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
//        List<SearchResultItem> items = new ArrayList<>();
//        for (int i = 0; i < 4; i++) {
//            SearchResultItem searchResultItem = new SearchResultItem();
//            searchResultItem.setPubDate(Instant.now());
//            items.add(searchResultItem);
//        }
//        indexerSearchResult.setSearchResultItems(items);
//        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 0, 100);
//        assertThat(indexerSearchResult.getOffset()).isEqualTo(0);
//        assertThat(indexerSearchResult.getPageSize()).isEqualTo(100);
//        assertThat(indexerSearchResult.getTotalResults()).isEqualTo(4);
//        assertThat(indexerSearchResult.isTotalResultsKnown()).isEqualTo(true);
//        assertThat(indexerSearchResult.isHasMoreResults()).isEqualTo(false);
//    }


    @Test
    void shouldRecognizeIfMoreResultsAvailable() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        String html = Resources.toString(Resources.getResource(NzbKingTest.class, "/org/nzbhydra/mapping/nzbKing.html"), Charsets.UTF_8);
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult(testee, "");
        testee.completeIndexerSearchResult(html, indexerSearchResult, null, searchRequest, 0, 100);
        assertThat(indexerSearchResult.isTotalResultsKnown()).isEqualTo(false);
        assertThat(indexerSearchResult.isHasMoreResults()).isEqualTo(false);
    }

    @Test
    void shouldRecognizeWhenNoResultsFound() throws Exception {
        String html = Resources.toString(Resources.getResource(NzbKingTest.class, "/org/nzbhydra/mapping/nzbKing_noresults.html"), Charsets.UTF_8);
        List<SearchResultItem> searchResultItems = testee.getSearchResultItems(html, new SearchRequest());
        assertThat(searchResultItems).isEmpty();
    }

    @Test
    void shouldBuildSimpleQuery() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.toUriString()).isEqualTo("https://www.nzbking.com/search?q=query&o=0");
    }

    @Test
    void shouldAddRequiredWords() throws IndexerSearchAbortedException {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.getInternalData().setRequiredWords(Arrays.asList("a", "b"));
        searchRequest.setQuery("query");
        UriComponentsBuilder builder = testee.buildSearchUrl(searchRequest, 0, 100);
        assertThat(builder.build().toString()).isEqualTo("https://www.nzbking.com/search?q=query a b&o=0");
    }

    @Test
    void shouldAbortIfSearchNotPossible() throws IndexerSearchAbortedException {
        assertThrows(IndexerSearchAbortedException.class, () -> {
            SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
            testee.buildSearchUrl(searchRequest, 0, 100);
        });
    }

//    @Test
//    void shouldGetAndParseNfo() throws Exception {
//        String nfoHtml = Resources.toString(Resources.getResource(NzbKingTest.class, "/org/nzbhydra/mapping/binsearch_nfo.html"), Charsets.UTF_8);
//        testee = spy(testee);
//        doReturn(nfoHtml).when(testee).getAndStoreResultToDatabase(uriCaptor.capture(), any(), any());
//
//        NfoResult nfoResult = testee.getNfo("1234");
//
//        assertThat(nfoResult.isHasNfo()).isEqualTo(true);
//        assertThat(nfoResult.getContent()).isEqualTo("nfocontent");
//        assertThat(uriCaptor.getValue().toString()).isEqualTo("https://www.binsearch.info/viewNFO.php?oid=1234");
//    }

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
