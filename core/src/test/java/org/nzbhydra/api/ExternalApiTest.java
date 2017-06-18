package org.nzbhydra.api;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.NzbHandler;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;

import java.time.Clock;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

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


    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.setMain(new MainConfig());
        baseConfig.getMain().setApiKey("apikey");

        when(searchRequestFactory.getSearchRequest(any(), any(), any(), anyLong(), any(), any())).thenReturn(new SearchRequest(SearchSource.API, SearchType.SEARCH, 0, 100));
        when(searcher.search(any())).thenReturn(searchResult);
        when(searchResult.getNumberOfAcceptedResults()).thenReturn(10);
        when(searchResult.getNumberOfProcessedResults()).thenReturn(10);
        when(searchResult.getNumberOfRejectedResults()).thenReturn(0);
        when(searchResult.getNumberOfRemovedDuplicates()).thenReturn(0);
        when(searchResult.getNumberOfTotalAvailableResults()).thenReturn(10);
    }

    @Test
    public void shouldCache() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters, null);
        verify(searcher).search(any());

        testee.api(parameters, null);
        verify(searcher, times(1)).search(any());
    }

    @Test
    public void shouldRepeatSearchWhenCacheTimeIsOver() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters, null);
        verify(searcher).search(any());

        testee.api(parameters, null);
        verify(searcher, times(1)).search(any());

        testee.clock = Clock.fixed(testee.clock.instant().plus(6, ChronoUnit.MINUTES), ZoneId.of("UTC"));
        testee.api(parameters, null);
        verify(searcher, times(2)).search(any());
    }

    @Test
    public void shouldCacheRemoveEntriesWhenLimitReached() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q1");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters, null);
        verify(searcher).search(any());

        testee.api(parameters, null);
        verify(searcher, times(1)).search(any());

        parameters.setQ("q2");
        testee.api(parameters, null);
        verify(searcher, times(2)).search(any());
        parameters.setQ("q3");
        testee.api(parameters, null);
        verify(searcher, times(3)).search(any());
        parameters.setQ("q4");
        testee.api(parameters, null);
        verify(searcher, times(4)).search(any());
        parameters.setQ("q5");
        testee.api(parameters, null);
        verify(searcher, times(5)).search(any());

        parameters.setQ("q1"); //q1 is still cached
        testee.api(parameters, null);
        verify(searcher, times(5)).search(any());

        parameters.setQ("q6"); //now q1 is removed as oldest entry
        testee.api(parameters, null);
        verify(searcher, times(6)).search(any());
        parameters.setQ("q1"); //Not cached anymore, will do another search
        testee.api(parameters, null);
        verify(searcher, times(7)).search(any());
    }

}