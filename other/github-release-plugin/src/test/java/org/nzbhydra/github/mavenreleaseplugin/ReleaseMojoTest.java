package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.HttpUrl;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;

public class ReleaseMojoTest extends AbstractMojoTestCase {

    private ObjectMapper objectMapper = new ObjectMapper();

    public void testExecute() throws Exception {
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
        server.enqueue(new MockResponse().setResponseCode(200)); //Linux asset upload
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(effectiveReleaseResponse))); //Setting the release effective

        HttpUrl url = server.url("/repos/theotherp/nzbhydra2/releases");

        //Here the magic happens
        executePlugin(url);

        //Creating the release
        verifyDraftReleaseIsCreated(server);

        //Uploading the assets
        RecordedRequest windowsAssetUploadRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(windowsAssetUploadRequest.getPath(), windowsAssetUploadRequest.getPath().endsWith("releases/1/assets?name=windowsAsset.txt"));
        RecordedRequest linuxAssetUploadRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(linuxAssetUploadRequest.getPath(), linuxAssetUploadRequest.getPath().endsWith("releases/1/assets?name=linuxAsset.txt"));

        //Setting it effective
        RecordedRequest setEffectiveRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(setEffectiveRequest.getPath(), setEffectiveRequest.getPath().endsWith("releases/1"));
        String body = new String(setEffectiveRequest.getBody().readByteArray());
        Release bodyJson = objectMapper.readValue(body, Release.class);
        assertFalse(bodyJson.isDraft());
    }

    protected void verifyDraftReleaseIsCreated(MockWebServer server) throws InterruptedException, IOException {
        RecordedRequest releaseRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(releaseRequest.getRequestLine(), releaseRequest.getPath().endsWith("access_token=token"));

        String body = new String(releaseRequest.getBody().readByteArray());
        Release bodyJson = objectMapper.readValue(body, Release.class);
        assertEquals("tagName", bodyJson.getTagName());
        assertFalse(bodyJson.isPrerelease());
        assertEquals("commitish", bodyJson.getTargetCommitish());
        assertTrue(bodyJson.isDraft());
        assertEquals("tagName", bodyJson.getTagName());
        assertEquals("changelog", bodyJson.getBody());
    }

    protected void executePlugin(HttpUrl url) throws Exception {
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pom.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin", pom
        ));
        releaseMojo.githubReleasesUrl = url.toString();
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAsset.txt");

        releaseMojo.execute();
    }


}