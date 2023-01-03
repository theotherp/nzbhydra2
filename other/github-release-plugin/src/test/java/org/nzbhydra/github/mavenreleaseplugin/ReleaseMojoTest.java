package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.HttpUrl;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;
import org.codehaus.plexus.configuration.PlexusConfiguration;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class ReleaseMojoTest extends AbstractMojoTestCase {

    private ObjectMapper objectMapper = new ObjectMapper();

    public void setUp() throws Exception {
        super.setUp();
        Files.copy(getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.json.orig").toPath(), getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.json").toPath(), StandardCopyOption.REPLACE_EXISTING);
    }

    public void testExecute() throws Exception {
        MockWebServer server = getMockWebServer();
        HttpUrl url = server.url("/repos/theotherp/nzbhydra2/releases");

        //Here the magic happens
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithToken.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin", pom
        ));
        releaseMojo.githubReleasesUrl = url.toString();
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAsset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        releaseMojo.execute();
        verifyExecution(server);
    }


    public void testExecuteWithMissingChangelogEntry() throws Exception {
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithChangelogWrongLatestEntry.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin", pom
        ));
        releaseMojo.githubReleasesUrl = "notUsed";
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAsset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        try {
            releaseMojo.execute();
            fail("Expected mojo exception");
        } catch (MojoExecutionException e) {
            assertTrue(e.getMessage().contains("Latest changelog entry version v0.0.1 does not match tag name v1.0.0"));
        }
    }

    public void testExecuteWithoutToken() throws Exception {
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithoutToken.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin", pom
        ));
        releaseMojo.githubReleasesUrl = "http://127.0.0.1";
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAsset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        try {
            releaseMojo.execute();
            fail("Expected mojo exception");
        } catch (MojoExecutionException e) {
            assertTrue(e.getMessage().contains("GitHub Token and GitHub token file not set"));
        }
    }

    public void testExecuteWithTokenFile() throws Exception {
        MockWebServer server = getMockWebServer();
        HttpUrl url = server.url("/repos/theotherp/nzbhydra2/releases");

        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithTokenFile.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin", pom
        ));
        releaseMojo.githubReleasesUrl = url.toString();
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAsset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        releaseMojo.execute();

        verifyExecution(server);
    }

    public void testDryRun() throws Exception {
        MockWebServer server = getMockWebServer();
        HttpUrl url = server.url("/repos/theotherp/nzbhydra2/releases");

        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithTokenFile.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo.dryRun = true;
        final PlexusConfiguration pluginConfiguration = extractPluginConfiguration("github-release-plugin", pom);

        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, pluginConfiguration);
        releaseMojo.githubReleasesUrl = url.toString();
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAsset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        releaseMojo.execute();

        assertThat(server.getRequestCount()).isEqualTo(0);
    }

    protected void verifyExecution(MockWebServer server) throws InterruptedException, IOException {
        //Creating the release
        verifyDraftReleaseIsCreated(server);

        //Uploading the assets
        RecordedRequest windowsAssetUploadRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(windowsAssetUploadRequest.getPath(), windowsAssetUploadRequest.getPath().contains("releases/1/assets?name=windowsAsset.txt"));
        assertThat("token token").isEqualTo(windowsAssetUploadRequest.getHeader("Authorization"));
        RecordedRequest linuxAssetUploadRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(linuxAssetUploadRequest.getPath(), linuxAssetUploadRequest.getPath().contains("releases/1/assets?name=linuxAsset.txt"));
        assertThat("token token").isEqualTo(linuxAssetUploadRequest.getHeader("Authorization"));
        RecordedRequest genericAssetUploadRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(genericAssetUploadRequest.getPath(), genericAssetUploadRequest.getPath().contains("releases/1/assets?name=genericAsset.txt"));
        assertThat("token token").isEqualTo(genericAssetUploadRequest.getHeader("Authorization"));

        //Setting it effective
        RecordedRequest setEffectiveRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(setEffectiveRequest.getPath(), setEffectiveRequest.getPath().contains("releases/1"));
        assertThat("token token").isEqualTo(setEffectiveRequest.getHeader("Authorization"));
        String body = new String(setEffectiveRequest.getBody().readByteArray());
        Release bodyJson = objectMapper.readValue(body, Release.class);
        assertThat(bodyJson.isDraft()).isFalse();
    }


    private MockWebServer getMockWebServer() throws JsonProcessingException {
        MockWebServer server = new MockWebServer();
        Release draftReleaseResponse = new Release();
        draftReleaseResponse.setUploadUrl(server.url("/repos/theotherp/nzbhydra2/releases/1/assets").toString());
        draftReleaseResponse.setUrl(server.url("/repos/theotherp/nzbhydra2/releases/1").toString());
        draftReleaseResponse.setDraft(true);

        ArrayList<Asset> assets = new ArrayList<>();
        assets.add(new Asset());
        assets.add(new Asset());
        draftReleaseResponse.setAssets(assets);
        Release effectiveReleaseResponse = new Release();

        effectiveReleaseResponse.setDraft(false);
        MockResponse releaseMockResponse = new MockResponse()
                .setResponseCode(200)
                .setBody(objectMapper.writeValueAsString(draftReleaseResponse));
        server.enqueue(releaseMockResponse);
        server.enqueue(new MockResponse().setResponseCode(200)); //Windows asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //generic asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //Linux asset upload
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(effectiveReleaseResponse))); //Setting the release effective
        return server;
    }


    protected void verifyDraftReleaseIsCreated(MockWebServer server) throws InterruptedException, IOException {
        RecordedRequest releaseRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertFalse(releaseRequest.getRequestLine(), releaseRequest.getPath().contains("access_token"));
        assertEquals(releaseRequest.getHeader("Authorization"), "token token");

        String body = new String(releaseRequest.getBody().readByteArray());
        Release bodyJson = objectMapper.readValue(body, Release.class);
        assertThat(bodyJson.getTagName()).isEqualTo("v1.0.0");
        assertTrue(bodyJson.isPrerelease());
        assertThat(bodyJson.getTargetCommitish()).isEqualTo("commitish");
        assertTrue(bodyJson.isDraft());
        assertThat(bodyJson.getName()).isEqualTo("v1.0.0");
        assertEquals("### v1.0.0 BETA (2019-11-16)\n\n" +
            "**Note** First major release\n\n", bodyJson.getBody());
    }


}
