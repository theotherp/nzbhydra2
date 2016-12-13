package org.nzbhydra.searching;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.database.*;
import org.nzbhydra.searching.searchmodules.Newznab;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springconfig.AppConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.mockito.Matchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@RunWith(SpringRunner.class)
@ContextConfiguration(classes = {Searcher.class, DuplicateDetector.class, Newznab.class, SearchModuleConfigProvider.class, SearchModuleProvider.class, AppConfig.class})
//@Configuration
//@ConfigurationProperties
//@EnableConfigurationProperties
@TestPropertySource(locations = "classpath:/org/nzbhydra/searching/application.properties")
public class SearcherTest {

    @Autowired
    private Searcher searcher;

//    @Autowired
//    private SearchModuleProvider searchModuleProviderMock;

    @Autowired
    private DuplicateDetector duplicateDetector;

    @Autowired
    private Newznab newznabMock1;

    @Autowired
    private Newznab newznabMock2;

    @MockBean
    private SearchResultRepository searchResultRepositoryMock;

    @MockBean
    private IndexerRepository indexerRepositoryMock;

    @Autowired
    private RestTemplate restTemplateMock;

//    @Autowired
//    private SearchModuleConfigProvider searchModuleConfigProvider;

    @MockBean
    private SearchRepository searchRepositoryMock;

    @Mock
    private IndexerEntity indexerEntityMock;

    @Mock
    private SearchResultEntity searchResultEntityMock;

    @Captor
    private ArgumentCaptor<List<SearchResultItem>> searchResultItemsCaptor;


    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(searchResultEntityMock.getIndexerEntity()).thenReturn(indexerEntityMock);
        when(indexerRepositoryMock.findByName(anyString())).thenReturn(indexerEntityMock);
        //when(searchResultRepositoryMock.findByIndexerEntityAndIndexerGuid(any(Indexer.class), anyString())).thenReturn(searchResultEntityMock);
        searcher.duplicateDetector = duplicateDetector;
        //when(searchModuleProviderMock.getIndexers()).thenReturn(Arrays.asList(newznabMock1, newznabMock2));
//        IndexerConfig indexerConfig = new IndexerConfig();
//        indexerConfig.setHost("http://localhost");
//        when(searchModuleConfigProvider.getConfigByName(anyString())).thenReturn(indexerConfig);
//        when(searchModuleConfigProvider.getIndexers()).thenReturn(Arrays.asList(indexerConfig));
    }


    @Test
    public void shouldTransformToRssXml() throws Exception {

        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplateMock).build();
        String expectedContent = Resources.toString(Resources.getResource(SearcherTest.class, "simplesearchresult1.xml"), Charsets.UTF_8);

        server.
                //expect(requestTo("http://localhost:7070/api?t=search")).
                        expect(anything()).
                andRespond(withSuccess(expectedContent, MediaType.APPLICATION_XML));


        SearchResult searchResult = searcher.search(SearchRequest.builder().searchType(SearchType.SEARCH).build());
        //verify(duplicateDetector).detectDuplicates(searchResultItemsCaptor.capture());

        //assertThat(searchResultItemsCaptor.getValue().size(), is(2));

    }

}