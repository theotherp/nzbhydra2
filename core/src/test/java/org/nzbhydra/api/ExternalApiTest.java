package org.nzbhydra.api;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.downloading.NzbHandler;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.misc.UserAgentMapper;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.DownloadType;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;

import java.time.Clock;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


public class ExternalApiTest {

    BaseConfig baseConfig = new BaseConfig();

    @InjectMocks
    private ExternalApi testee = new ExternalApi();

    @Mock
    protected Searcher searcher;
    @Mock
    protected SearchRequestFactory searchRequestFactory;
    @Mock
    protected NzbHandler nzbHandler;
    @Mock
    protected ConfigProvider configProvider;
    @Mock
    private CategoryProvider categoryProvider;
    @Mock
    private SearchResult searchResult;
    @Mock
    private UserAgentMapper userAgentMapperMock;
    @Mock
    private Indexer indexerMock;
    @Mock
    private ConfigProvider providerMock;
    IndexerConfig indexerConfig = new IndexerConfig();


    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.setMain(new MainConfig());
        baseConfig.getMain().setApiKey("apikey");

        when(searchRequestFactory.getSearchRequest(any(), any(), any(), anyLong(), any(), any())).thenReturn(new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 100));
        when(searchRequestFactory.extendWithSavedIdentifiers(any())).thenAnswer(x -> x.getArguments()[0]);
        when(searcher.search(any())).thenReturn(searchResult);
        when(searchResult.getNumberOfAcceptedResults()).thenReturn(10);
        when(searchResult.getNumberOfProcessedResults()).thenReturn(10);
        when(searchResult.getNumberOfRejectedResults()).thenReturn(0);
        when(searchResult.getNumberOfRemovedDuplicates()).thenReturn(0);
        when(searchResult.getNumberOfTotalAvailableResults()).thenReturn(10);

        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());

        when(indexerMock.getConfig()).thenReturn(indexerConfig);
    }

    @Test
    public void shouldCache() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters);
        verify(searcher).search(any());

        testee.api(parameters);
        verify(searcher, times(1)).search(any());
    }

    @Test
    public void shouldRepeatSearchWhenCacheTimeIsOver() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters);
        verify(searcher).search(any());

        testee.api(parameters);
        verify(searcher, times(1)).search(any());

        testee.clock = Clock.fixed(testee.clock.instant().plus(6, ChronoUnit.MINUTES), ZoneId.of("UTC"));
        testee.api(parameters);
        verify(searcher, times(2)).search(any());
    }

    @Test
    public void shouldCacheRemoveEntriesWhenLimitReached() throws Exception {
        NewznabParameters parameters = getNewznabParameters("q1");

        testee.api(parameters);
        verify(searcher).search(any());

        testee.api(parameters);
        verify(searcher, times(1)).search(any());

        parameters.setQ("q2");
        testee.api(getNewznabParameters("q2"));
        verify(searcher, times(2)).search(any());
        parameters.setQ("q3");
        testee.api(getNewznabParameters("q3"));
        verify(searcher, times(3)).search(any());
        parameters.setQ("q4");
        testee.api(getNewznabParameters("q4"));
        verify(searcher, times(4)).search(any());
        parameters.setQ("q5");
        testee.api(getNewznabParameters("q5"));
        verify(searcher, times(5)).search(any());

        //q1 is still cached
        testee.api(getNewznabParameters("q1"));
        verify(searcher, times(5)).search(any());

        //now q1 is removed as oldest entry
        testee.api(getNewznabParameters("q6"));
        verify(searcher, times(6)).search(any());
        //Not cached anymore, will do another search
        testee.api(getNewznabParameters("q1"));
        verify(searcher, times(7)).search(any());
    }

    @Test
    public void shouldUseCorrectApplicationType() {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setIndexer(indexerMock);
        searchResultItem.setCategory(new Category());

        searchRequest.setDownloadType(DownloadType.NZB);
        RssItem item = testee.buildRssItem(searchResultItem, searchRequest);
        assertThat(item.getEnclosure().getType()).isEqualTo("application/x-nzb");

        searchRequest.setDownloadType(DownloadType.TORRENT);
        item = testee.buildRssItem(searchResultItem, searchRequest);
        assertThat(item.getEnclosure().getType()).isEqualTo("application/x-bittorrent");

    }

    protected NewznabParameters getNewznabParameters(String q1) {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ(q1);
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);
        return parameters;
    }

}