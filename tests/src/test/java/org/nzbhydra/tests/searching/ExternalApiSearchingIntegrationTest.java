package org.nzbhydra.tests.searching;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.api.ExternalApi;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.fortests.NewznabResponseBuilder;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.MediaIdType;
import org.nzbhydra.mediainfo.MediaInfo;
import org.nzbhydra.mediainfo.MovieInfo;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.core.Is.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@Transactional
public class ExternalApiSearchingIntegrationTest extends AbstractConfigReplacingTest {

    @Autowired
    private ExternalApi externalApi;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @MockBean
    private InfoProvider infoProvider;

    private final MockWebServer webServer = new MockWebServer();


    @Before
    public void setUp() throws IOException {
        MockitoAnnotations.initMocks(this);
        webServer.start(7070);
        replaceConfig(getClass().getResource("twoIndexers.json"));
        configProvider.getBaseConfig().getSearching().setGenerateQueries(SearchSourceRestriction.NONE);
        searchResultRepository.deleteAll();
    }

    @After
    public void tearDown() throws IOException {
        webServer.close();
    }

    @Test
    public void shouldSearch() throws Exception {
        String expectedContent1a = Resources.toString(Resources.getResource(ExternalApiSearchingIntegrationTest.class, "simplesearchresult1a.xml"), Charsets.UTF_8);
        String expectedContent1b = Resources.toString(Resources.getResource(ExternalApiSearchingIntegrationTest.class, "simplesearchresult1b.xml"), Charsets.UTF_8);
        String expectedContent2 = Resources.toString(Resources.getResource(ExternalApiSearchingIntegrationTest.class, "simplesearchresult2.xml"), Charsets.UTF_8);

        webServer.enqueue(new MockResponse().setBody(expectedContent1a).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webServer.enqueue(new MockResponse().setBody(expectedContent2).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webServer.enqueue(new MockResponse().setBody(expectedContent1b).setHeader("Content-Type", "application/xml; charset=utf-8"));

        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setApikey("apikey");
        apiCallParameters.setOffset(0);
        apiCallParameters.setLimit(2);
        apiCallParameters.setT(ActionAttribute.SEARCH);
        NewznabXmlRoot apiSearchResult = (NewznabXmlRoot) externalApi.api(apiCallParameters, null, null).getBody();
        Assert.assertThat(apiSearchResult.getRssChannel().getItems().size(), is(2));
        Assert.assertThat(apiSearchResult.getRssChannel().getItems().get(0).getTitle(), is("itemTitle1a"));
        Assert.assertThat(apiSearchResult.getRssChannel().getItems().get(1).getTitle(), is("itemTitle2"));

        apiCallParameters.setLimit(100);
        apiCallParameters.setOffset(2);

        apiSearchResult = (NewznabXmlRoot) externalApi.api(apiCallParameters, null, null).getBody();

        Assert.assertThat(apiSearchResult.getRssChannel().getItems().size(), is(1));
        Assert.assertThat(apiSearchResult.getRssChannel().getItems().get(0).getTitle(), is("itemTitle1b"));
    }

    @Test
    public void shouldCallIndexerWithMoreResultsASecondTime() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();

        String xml1 = builder.getTestResult(1, 2, "indexer1", 0, 3).toXmlString();
        String xml2 = builder.getTestResult(3, 3, "indexer1", 2, 3).toXmlString();
        String xml3 = builder.getTestResult(1, 0, "indexer2", 0, 0).toXmlString();

        webServer.enqueue(new MockResponse().setBody(xml1).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webServer.enqueue(new MockResponse().setBody(xml2).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webServer.enqueue(new MockResponse().setBody(xml3).setHeader("Content-Type", "application/xml; charset=utf-8"));

        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setOffset(0);
        apiCallParameters.setLimit(2);
        apiCallParameters.setT(ActionAttribute.SEARCH);
        NewznabXmlRoot apiSearchResult = (NewznabXmlRoot) externalApi.api(apiCallParameters, null, null).getBody();

        org.assertj.core.api.Assertions.assertThat(apiSearchResult.getRssChannel().getItems().size()).isEqualTo(2);

        apiCallParameters.setLimit(100);
        apiCallParameters.setOffset(2);

        apiSearchResult = (NewznabXmlRoot) externalApi.api(apiCallParameters, null, null).getBody();

        org.assertj.core.api.Assertions.assertThat(apiSearchResult.getRssChannel().getItems().size()).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(apiSearchResult.getRssChannel().getItems().get(0).getTitle()).isEqualTo("indexer13");
    }

    @Test
    public void shouldCallNewznabTwice() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();

        String xml1 = builder.getTestResult(1, 100, "indexer1", 0, 150).toXmlString();
        String xml2 = builder.getTestResult(101, 150, "indexer1", 100, 150).toXmlString();
        String xml3 = builder.getTestResult(1, 0, "indexer2", 0, 0).toXmlString();

        webServer.enqueue(new MockResponse().setBody(xml1).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webServer.enqueue(new MockResponse().setBody(xml2).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webServer.enqueue(new MockResponse().setBody(xml3).setHeader("Content-Type", "application/xml; charset=utf-8"));

        NewznabParameters apiCallParameters = new NewznabParameters();
        apiCallParameters.setApikey("apikey");
        apiCallParameters.setOffset(0);
        apiCallParameters.setLimit(100);
        apiCallParameters.setT(ActionAttribute.SEARCH);
        NewznabXmlRoot apiSearchResult = (NewznabXmlRoot) externalApi.api(apiCallParameters, null, null).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size()).isEqualTo(100);

        apiCallParameters.setLimit(100);
        apiCallParameters.setOffset(100);

        apiSearchResult = (NewznabXmlRoot) externalApi.api(apiCallParameters, null, null).getBody();

        assertThat(apiSearchResult.getRssChannel().getItems().size()).isEqualTo(50);
    }


    @Test
    public void shouldUseProvidedIdentifiers() throws Exception{
        prepareIndexerWithOneResponse();
        searchModuleProvider.getIndexers().get(0).getConfig().setSupportedSearchIds(Arrays.asList(MediaIdType.IMDB, MediaIdType.TMDB));

        NewznabXmlRoot root = (NewznabXmlRoot) externalApi.api(NewznabParameters.builder().tmdbid("abcd").imdbid("1234").t(ActionAttribute.MOVIE).apikey("apikey").build(), null, null).getBody();
        RecordedRequest request = webServer.takeRequest(2, TimeUnit.SECONDS);

        assertThat(request.getPath()).contains("imdbid=1234").contains("tmdbid=abcd");
        assertThat(root.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(1);
        assertThat(root.getRssChannel().getItems().size()).isEqualTo(1);
    }


    @Test
    public void shouldConvertProvidedIdentifier() throws Exception{
        prepareIndexerWithOneResponse();
        searchModuleProvider.getIndexers().get(0).getConfig().setSupportedSearchIds(Arrays.asList(MediaIdType.IMDB));
        when(infoProvider.convert(anyMap())).thenReturn(new MediaInfo(new MovieInfo("tt1234", null, null, 0, null)));
        when(infoProvider.canConvertAny(anySet(), anySet())).thenReturn(true);

        NewznabXmlRoot root = (NewznabXmlRoot) externalApi.api(NewznabParameters.builder().tmdbid("abcd").t(ActionAttribute.MOVIE).apikey("apikey").build(), null, null).getBody();

        RecordedRequest request = webServer.takeRequest(2, TimeUnit.SECONDS);
        assertThat(request.getRequestUrl().queryParameter("imdbid")).isEqualTo("1234");
        assertThat(root.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(1);
        assertThat(root.getRssChannel().getItems().size()).isEqualTo(1);
    }

    @Test
    public void shouldGenerateQuery() throws Exception{
        prepareIndexerWithOneResponse();
        configProvider.getBaseConfig().getSearching().setGenerateQueries(SearchSourceRestriction.API);
        searchModuleProvider.getIndexers().get(0).getConfig().setSupportedSearchIds(Collections.emptyList());
        when(infoProvider.convert(anyMap())).thenReturn(new MediaInfo(new MovieInfo(null, null,"title", 0, null)));
        when(infoProvider.convert(any(), any())).thenReturn(new MediaInfo(new MovieInfo(null, null,"title", 0, null)));
        when(infoProvider.canConvertAny(anySet(), anySet())).thenReturn(false);

        NewznabXmlRoot root = (NewznabXmlRoot) externalApi.api(NewznabParameters.builder().tmdbid("abcd").t(ActionAttribute.MOVIE).apikey("apikey").build(), null, null).getBody();

        RecordedRequest request = webServer.takeRequest(2, TimeUnit.SECONDS);
        assertThat(request.getRequestUrl().queryParameter("q")).isEqualTo("title");
        assertThat(root.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(1);
        assertThat(root.getRssChannel().getItems().size()).isEqualTo(1);
    }

    protected void prepareIndexerWithOneResponse() throws IOException {
        replaceConfig(getClass().getResource("oneIndexer.json"));
        NewznabXmlRoot response = NewznabMockBuilder.generateResponse(NewznabMockRequest.builder().total(1).offset(0).numberOfResults(1).build());
        webServer.enqueue(new MockResponse().setBody(response.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));
    }
}
