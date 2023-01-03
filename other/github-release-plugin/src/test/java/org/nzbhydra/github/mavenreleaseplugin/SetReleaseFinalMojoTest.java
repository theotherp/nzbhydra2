package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.HttpUrl;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class SetReleaseFinalMojoTest extends AbstractMojoTestCase {

    private ObjectMapper objectMapper = new ObjectMapper();

    public void setUp() throws Exception {
        super.setUp();
        Files.copy(getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.json.orig").toPath(), getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.json").toPath(), StandardCopyOption.REPLACE_EXISTING);
        System.setProperty("finalVersion", "v1.0.0");
    }

    public void testExecute() throws Exception {
        MockWebServer server = getMockWebServer();
        HttpUrl url = server.url("/repos/theotherp/nzbhydra2/releases");

        //Here the magic happens
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/setReleaseToFinalPom.xml");
        assertTrue(pom.exists());
        SetReleaseFinalMojo mojo = new SetReleaseFinalMojo();
        mojo = (SetReleaseFinalMojo) configureMojo(mojo, extractPluginConfiguration("github-release-plugin", pom
        ));
        mojo.githubReleasesUrl = url.toString();

        mojo.execute();
        verifyExecution(server);
    }


    protected void verifyExecution(MockWebServer server) throws InterruptedException, IOException {
        //Creating the release
        verifyDraftReleaseIsCreated(server);

    }


    private MockWebServer getMockWebServer() throws JsonProcessingException {
        MockWebServer server = new MockWebServer();
        Release listReleaseResponse = new Release();
        listReleaseResponse.setTagName("v1.0.0");
        listReleaseResponse.setPrerelease(true);
        listReleaseResponse.setName("v1.0.0");
        listReleaseResponse.setBody("body");
        listReleaseResponse.setUrl(server.url("/repos/theotherp/nzbhydra2/releases/1").toString());

        MockResponse releaseMockResponse = new MockResponse()
                .setResponseCode(200)
                .setBody(objectMapper.writeValueAsString(listReleaseResponse));
        server.enqueue(releaseMockResponse);

        Release finalReleaseResponse = new Release();
        finalReleaseResponse.setPrerelease(false);

        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(finalReleaseResponse))); //Setting the release effective
        return server;
    }


    protected void verifyDraftReleaseIsCreated(MockWebServer server) throws InterruptedException, IOException {
        //Ignore listing request
        server.takeRequest(2, TimeUnit.SECONDS);

        RecordedRequest releaseRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertFalse(releaseRequest.getRequestLine(), releaseRequest.getPath().contains("access_token=token"));
        assertEquals(releaseRequest.getHeader("Authorization"), "token token");

        String body = new String(releaseRequest.getBody().readByteArray());
        Release bodyJson = objectMapper.readValue(body, Release.class);
        assertThat(bodyJson.getTagName()).isEqualTo("v1.0.0");
        assertThat(bodyJson.isPrerelease()).isFalse();
        assertThat(bodyJson.isDraft()).isFalse();
        assertThat(bodyJson.getName()).isEqualTo("v1.0.0");
        assertEquals("### v1.0.0 (2019-11-16)\n\n" +
            "**Note** First major release\n\n", bodyJson.getBody());
    }


}
