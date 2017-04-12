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
import org.nzbhydra.api.ExternalApi;
import org.nzbhydra.fortests.NewznabResponseBuilder;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.rss.RssRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;

import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;
import static org.mockserver.integration.ClientAndProxy.startClientAndProxy;
import static org.mockserver.integration.ClientAndServer.startClientAndServer;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@DataJpaTest
@TestPropertySource(locations = {"classpath:org/nzbhydra/tests/searching/externalApiTest.properties}", "classpath:org/nzbhydra/tests/categories.properties"})
public class ExternalApiSearchingIntegrationTest {

    @Autowired
    private ExternalApi externalApi;

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

        String expectedContent1a = Resources.toString(Resources.getResource(ExternalApiSearchingIntegrationTest.class, "simplesearchresult1a.xml"), Charsets.UTF_8);
        String expectedContent1b = Resources.toString(Resources.getResource(ExternalApiSearchingIntegrationTest.class, "simplesearchresult1b.xml"), Charsets.UTF_8);
        String expectedContent2 = Resources.toString(Resources.getResource(ExternalApiSearchingIntegrationTest.class, "simplesearchresult2.xml"), Charsets.UTF_8);

        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(expectedContent1a).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(expectedContent1b).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey2"))).respond(HttpResponse.response().withBody(expectedContent2).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));


        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setApikey("apikey");
        apiCallParameters.setOffset(0);
        apiCallParameters.setLimit(2);
        apiCallParameters.setT(ActionAttribute.SEARCH);
        RssRoot apiSearchResult = (RssRoot) externalApi.api(apiCallParameters).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size(), is(2));

        apiCallParameters.setLimit(100);
        apiCallParameters.setOffset(2);

        apiSearchResult = (RssRoot) externalApi.api(apiCallParameters).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size(), is(1));
        assertThat(apiSearchResult.getRssChannel().getItems().get(0).getTitle(), is("itemTitle1a"));
    }

    @Test
    public void test2() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();

        String xml1 = builder.getTestResult(1, 2, "indexer1", 0, 3).toXmlString();
        String xml2 = builder.getTestResult(3, 3, "indexer1", 2, 3).toXmlString();
        String xml3 = builder.getTestResult(1, 0, "indexer2", 0, 0).toXmlString();

        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(xml1).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(xml2).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey2"))).respond(HttpResponse.response().withBody(xml3).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));

        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setApikey("apikey");
        apiCallParameters.setOffset(0);
        apiCallParameters.setLimit(2);
        apiCallParameters.setT(ActionAttribute.SEARCH);
        RssRoot apiSearchResult = (RssRoot) externalApi.api(apiCallParameters).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size(), is(2));

        apiCallParameters.setLimit(100);
        apiCallParameters.setOffset(2);

        apiSearchResult = (RssRoot) externalApi.api(apiCallParameters).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size(), is(1));
        assertThat(apiSearchResult.getRssChannel().getItems().get(0).getTitle(), is("itemTitle13"));
    }

    @Test
    public void shouldCallNewznabTwice() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();

        String xml1 = builder.getTestResult(1, 100, "indexer1", 0, 150).toXmlString();
        String xml2 = builder.getTestResult(101, 150, "indexer1", 100, 150).toXmlString();
        String xml3 = builder.getTestResult(1, 0, "indexer2", 0, 0).toXmlString();

        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(xml1).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey1"))).respond(HttpResponse.response().withBody(xml2).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey2"))).respond(HttpResponse.response().withBody(xml3).withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));

        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setApikey("apikey");
        apiCallParameters.setOffset(0);
        apiCallParameters.setLimit(100);
        apiCallParameters.setT(ActionAttribute.SEARCH);
        RssRoot apiSearchResult = (RssRoot) externalApi.api(apiCallParameters).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size(), is(100));

        apiCallParameters.setLimit(100);
        apiCallParameters.setOffset(100);

        apiSearchResult = (RssRoot) externalApi.api(apiCallParameters).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size(), is(50));
    }

    //TODO
    public void shouldHandleErrorCodes() throws Exception {

        mockServer.when(HttpRequest.request().withPath("/api").withQueryStringParameter(new Parameter("apikey", "apikey"))).respond(HttpResponse.response().withBody("<error code=\"100\" description=\"a description\">").withHeaders(
                new Header("Content-Type", "application/xml; charset=utf-8")
        ));
        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setT(ActionAttribute.SEARCH);
        apiCallParameters.setApikey("apikey");

    }

}