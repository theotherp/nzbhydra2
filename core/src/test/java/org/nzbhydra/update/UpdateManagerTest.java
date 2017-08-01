package org.nzbhydra.update;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import okhttp3.OkHttpClient.Builder;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockserver.integration.ClientAndServer;
import org.mockserver.model.Header;
import org.mockserver.model.HttpRequest;
import org.mockserver.model.HttpResponse;
import org.mockserver.verify.VerificationTimes;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.update.UpdateManager.BlockedVersion;

import java.util.Arrays;

import static junit.framework.TestCase.assertTrue;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockserver.integration.ClientAndServer.startClientAndServer;

public class UpdateManagerTest {

    private HttpRequest latestRequest;
    private HttpRequest releasesRequest;
    private HttpRequest changelogRequest;
    private HttpRequest blockedVersionsRequest;
    private ClientAndServer mockServer;
    @Mock
    private HydraOkHttp3ClientHttpRequestFactory requestFactoryMock;
    @Mock
    private GenericStorage<UpdateData> updateDataGenericStorageMock;

    private static String changelog = "some changes";

    @InjectMocks
    private UpdateManager testee = new UpdateManager();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);

        mockServer = startClientAndServer(7070);
        testee.currentVersionString = "0.0.1";
        testee.repositoryBaseUrl = "http:/127.0.0.1:7070/repos/theotherp/apitests";
        testee.changelogUrl = "http:/127.0.0.1:7070/changelog.md";
        testee.blockedVersionsUrl = "http:/127.0.0.1:7070/blockedVersions.json";
        testee.afterPropertiesSet();

        Release latestRelease = new Release();
        latestRelease.setTagName("v2.0.0");
        latestRelease.setBody("Some new stuff");

        Release previousRelease = new Release();
        previousRelease.setTagName("v1.0.0");
        previousRelease.setBody("A list:\n" +
                "* a\n" +
                "* b");

        latestRequest = HttpRequest.request().withPath("/repos/theotherp/apitests/releases/latest");
        mockServer.when(latestRequest).respond(HttpResponse.response().withBody(objectMapper.writeValueAsString(latestRelease)).withHeaders(
                new Header("Content-Type", "application/json; charset=utf-8")));

        releasesRequest = HttpRequest.request().withPath("/repos/theotherp/apitests/releases");
        //Return in wrong order to test sorting of releases by version
        mockServer.when(releasesRequest).respond(HttpResponse.response().withBody(objectMapper.writeValueAsString(Arrays.asList(previousRelease, latestRelease))).withHeaders(
                new Header("Content-Type", "application/json; charset=utf-8")));

        changelogRequest = HttpRequest.request().withPath("/changelog.md");
        mockServer.when(changelogRequest).respond(HttpResponse.response().withBody(changelog).withHeaders(
                new Header("Content-Type", "application/raw; charset=utf-8")));

        blockedVersionsRequest = HttpRequest.request().withPath("/blockedVersions.json");
        mockServer.when(blockedVersionsRequest).respond(HttpResponse.response().withBody(new ObjectMapper().writeValueAsString(Arrays.asList(new BlockedVersion(new SemanticVersion("3.0.0"), "comment")))).withHeaders(
                new Header("Content-Type", "application/json; charset=utf-8")));

        when(requestFactoryMock.getOkHttpClientBuilder(any())).thenReturn(new Builder());
    }

    @After
    public void tearDown() {
        mockServer.stop();
    }


    @Test
    public void testThatChecksForUpdateAvailable() throws Exception {
        assertTrue(testee.isUpdateAvailable());
        testee.currentVersion = new SemanticVersion("v2.0.0");
        assertFalse(testee.isUpdateAvailable());
    }

    @Test
    public void shouldGetLatestReleaseFromGithub() throws Exception {
        String latestVersionString = testee.getLatestVersionString();
        assertEquals("2.0.0", latestVersionString);

        //Should not contact repository again if last request was less than 15 minutes ago
        testee.getLatestVersionString();
        mockServer.verify(latestRequest, VerificationTimes.exactly(1));
    }

    @Test
    public void shouldGetChangesSince() throws Exception {
        String changesSince = testee.getChangesSince();
        String expectedChangesSince = "<h2>v2.0.0</h2>\n" +
                "<p>Some new stuff</p>\n" +
                "<hr />\n" +
                "<h2>v1.0.0</h2>\n" +
                "<p>A list:</p>\n" +
                "<ul>\n" +
                "<li>a</li>\n" +
                "<li>b</li>\n" +
                "</ul>\n";
        assertEquals(expectedChangesSince, changesSince);
    }

    @Test
    public void shouldGetChangelog() throws Exception {
        assertEquals(changelog, testee.getFullChangelog());
    }


}