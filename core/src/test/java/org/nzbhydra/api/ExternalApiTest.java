package org.nzbhydra.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.mapping.newznab.json.NewznabJsonRoot;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.misc.UserAgentMapper;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.CustomQueryAndTitleMappingHandler;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;

import javax.xml.transform.stream.StreamResult;
import java.time.Clock;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class ExternalApiTest {

    BaseConfig baseConfig = new BaseConfig();

    @InjectMocks
    private ExternalApi testee = new ExternalApi();

    @Mock
    protected Searcher searcher;
    @Mock
    protected SearchRequestFactory searchRequestFactory;
    @Mock
    protected FileHandler nzbHandler;
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
    private NewznabXmlTransformer newznabXmlTransformerMock;
    @Mock
    private NewznabJsonTransformer newznabJsonTransformerMock;
    @Mock
    private Jaxb2Marshaller jaxb2MarshallerMock;
    @Mock
    private CustomQueryAndTitleMappingHandler customQueryAndTitleMappingHandler;
    IndexerConfig indexerConfig = new IndexerConfig();


    @BeforeEach
    public void setUp() {

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
        doAnswer(new Answer<Void>() {
            @Override
            public Void answer(InvocationOnMock invocation) throws Throwable {
                StreamResult streamResult = (StreamResult) invocation.getArguments()[1];
                streamResult.getOutputStream().write("".getBytes(), 0, "".getBytes().length);
                return null;
            }
        }).when(jaxb2MarshallerMock).marshal(any(), any());
        when(indexerMock.getConfig()).thenReturn(indexerConfig);

        when(newznabXmlTransformerMock.getRssRoot(any(), anyInt(), anyInt(), any(Boolean.class))).thenReturn(new NewznabXmlRoot());
        when(customQueryAndTitleMappingHandler.mapSearchRequest(any())).thenAnswer((Answer<SearchRequest>) invocation -> invocation.getArgument(0));
    }

    @Test
    void shouldCache() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters, null, null);
        verify(searcher).search(any());

        testee.api(parameters, null, null);
        verify(searcher, times(1)).search(any());
    }

    @Test
    void shouldRepeatSearchWhenCacheTimeIsOver() throws Exception {
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setCachetime(5);

        testee.api(parameters, null, null);
        verify(searcher).search(any());

        testee.api(parameters, null, null);
        verify(searcher, times(1)).search(any());

        testee.clock = Clock.fixed(testee.clock.instant().plus(6, ChronoUnit.MINUTES), ZoneId.of("UTC"));
        testee.api(parameters, null, null);
        verify(searcher, times(2)).search(any());
    }

    @Test
    void shouldCacheRemoveEntriesWhenLimitReached() throws Exception {
        NewznabParameters parameters = getNewznabParameters("q1");

        testee.api(parameters, null, null);
        verify(searcher).search(any());

        testee.api(parameters, null, null);
        verify(searcher, times(1)).search(any());

        parameters.setQ("q2");
        testee.api(getNewznabParameters("q2"), null, null);
        verify(searcher, times(2)).search(any());
        parameters.setQ("q3");
        testee.api(getNewznabParameters("q3"), null, null);
        verify(searcher, times(3)).search(any());
        parameters.setQ("q4");
        testee.api(getNewznabParameters("q4"), null, null);
        verify(searcher, times(4)).search(any());
        parameters.setQ("q5");
        testee.api(getNewznabParameters("q5"), null, null);
        verify(searcher, times(5)).search(any());

        //q1 is still cached
        testee.api(getNewznabParameters("q1"), null, null);
        verify(searcher, times(5)).search(any());

        //now q1 is removed as oldest entry
        testee.api(getNewznabParameters("q6"), null, null);
        verify(searcher, times(6)).search(any());
        //Not cached anymore, will do another search
        testee.api(getNewznabParameters("q1"), null, null);
        verify(searcher, times(7)).search(any());
    }

    @Test
    void shouldUseCorrectHeaders() throws Exception {
        NewznabJsonRoot jsonRoot = new NewznabJsonRoot();
        when(newznabJsonTransformerMock.transformToRoot(any(), any(), anyInt(), any(Boolean.class))).thenReturn(jsonRoot);
        NewznabParameters parameters = new NewznabParameters();
        parameters.setQ("q1");
        parameters.setApikey("apikey");
        parameters.setT(ActionAttribute.SEARCH);
        parameters.setO(OutputType.JSON);

        ResponseEntity<?> responseEntity = testee.api(parameters, null, null);
        assertThat(responseEntity.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON_UTF8);

        NewznabXmlRoot xmlRoot = new NewznabXmlRoot();
        when(newznabXmlTransformerMock.getRssRoot(any(), any(), anyInt(), any(Boolean.class))).thenReturn(xmlRoot);

        parameters.setO(OutputType.XML);
        responseEntity = testee.api(parameters, null, null);
        assertThat(responseEntity.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_XML);
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
