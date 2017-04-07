package org.nzbhydra.tests.searching;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockserver.integration.ClientAndProxy;
import org.mockserver.integration.ClientAndServer;
import org.mockserver.model.Header;
import org.mockserver.model.HttpRequest;
import org.mockserver.model.HttpResponse;
import org.mockserver.model.Parameter;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.web.client.RestTemplate;

import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;
import static org.mockserver.integration.ClientAndProxy.startClientAndProxy;
import static org.mockserver.integration.ClientAndServer.startClientAndServer;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
//@ContextConfiguration(classes = {Searcher.class, DuplicateDetector.class, Newznab.class, SearchModuleConfigProvider.class, SearchModuleProvider.class, AppConfig.class, SearchResultRepository.class, IndexerRepository.class})
//@Configuration
@DataJpaTest
//@ConfigurationProperties
//@EnableConfigurationProperties
@TestPropertySource(locations = "classpath:/org/nzbhydra/tests/searching/application.properties")
public class SearchingIntegrationTest {

    @Autowired
    private Searcher searcher;


    @Autowired
    private RestTemplate restTemplateMock;

    private ClientAndProxy proxy;
    private ClientAndServer mockServer;

    @Before
    public void startProxy() {
        mockServer = startClientAndServer(7070);
        proxy = startClientAndProxy(7072);
    }

    @After
    public void stopProxy() {
        proxy.stop();
        mockServer.stop();
    }


    @Test
    public void shouldSearch() throws Exception {

        String expectedContent1a = Resources.toString(Resources.getResource(SearchingIntegrationTest.class, "simplesearchresult1a.xml"), Charsets.UTF_8);
        String expectedContent1b = Resources.toString(Resources.getResource(SearchingIntegrationTest.class, "simplesearchresult1b.xml"), Charsets.UTF_8);
        String expectedContent2 = Resources.toString(Resources.getResource(SearchingIntegrationTest.class, "simplesearchresult2.xml"), Charsets.UTF_8);

        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(expectedContent1a).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(expectedContent1b).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey2"))).respond(HttpResponse.response().withBody(expectedContent2).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));


        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 2);
        SearchResult searchResult = searcher.search(searchRequest);

        assertThat(searchResult.getDuplicateDetectionResult().getDuplicateGroups().size(), is(2));

        searchRequest.setLimit(100);
        searchRequest.setOffset(2);

        searchResult = searcher.search(searchRequest);

        assertThat(searchResult.getDuplicateDetectionResult().getDuplicateGroups().size(), is(3));

    }

}