package org.nzbhydra.tests.searching;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.Searcher;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.nzbhydra.web.WebConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import org.springframework.test.context.junit4.SpringRunner;

import java.io.IOException;
import java.util.Collections;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
public class ConcurrentSearchesTest extends AbstractConfigReplacingTest {

    @Autowired
    private Searcher searcher;

    private ObjectMapper objectMapper = new ObjectMapper();

    MockWebServer server = new MockWebServer();


    Jaxb2Marshaller marshaller = new WebConfiguration().marshaller();


    @Before
    public void setUp() throws IOException {
        replaceConfig(getClass().getResource("fiveIndexers.json"));


        //String body = objectMapper.writeValueAsString(NewznabMockBuilder.generateResponse(0, 100, "test", false));
        String body = NewznabMockBuilder.generateResponse(0, 100, "test", false, Collections.emptyList()).toXmlString();
        MockResponse releaseMockResponse = new MockResponse()
                .setResponseCode(200)
                .setBody(body)
                .addHeader("Content-Type", "application/xml; charset=utf-8");

        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.enqueue(releaseMockResponse);
        server.start(7070);
    }

    @After
    public void stopProxy() throws Exception {
        server.close();
    }


    @Test
    public void shouldSearch() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searcher.search(searchRequest);
        searcher.search(searchRequest);
        searcher.search(searchRequest);
        searcher.search(searchRequest);
        searcher.search(searchRequest);

    }

}