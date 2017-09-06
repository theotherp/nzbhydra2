package org.nzbhydra;

import okhttp3.HttpUrl;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import java.io.File;
import java.util.concurrent.TimeUnit;

public class ReleaseMojoTest extends AbstractMojoTestCase {




    public void testExecute() throws Exception {
        MockWebServer server = new MockWebServer();
        JSONObject draftReleaseJsonResponse = new JSONObject();
        draftReleaseJsonResponse.put("upload_url", server.url("/repos/theotherp/nzbhydra2/releases/1/assets").toString());
        draftReleaseJsonResponse.put("url", server.url("/repos/theotherp/nzbhydra2/releases/1").toString());
        draftReleaseJsonResponse.put("draft",true);
        JSONObject effectiveReleaseJsonResponse = new JSONObject();

        effectiveReleaseJsonResponse.put("draft",false);
        MockResponse releaseMockResponse = new MockResponse()
                .setResponseCode(200)
                .setBody(draftReleaseJsonResponse.toJSONString());
        server.enqueue(releaseMockResponse);
        server.enqueue(new MockResponse().setResponseCode(200)); //Windows asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //Linux asset upload
        server.enqueue(new MockResponse().setResponseCode(200).setBody(effectiveReleaseJsonResponse.toJSONString())); //Setting the release effective


        //server.start();
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
        JSONObject bodyJson = (JSONObject) new JSONParser().parse(body);
        assertEquals(false, bodyJson.get("draft"));
    }

    protected void verifyDraftReleaseIsCreated(MockWebServer server) throws InterruptedException, ParseException {
        RecordedRequest releaseRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertTrue(releaseRequest.getRequestLine(), releaseRequest.getPath().endsWith("access_token=token"));

        String body = new String(releaseRequest.getBody().readByteArray());
        JSONObject bodyJson = (JSONObject) new JSONParser().parse(body);
        assertEquals("tagName", bodyJson.get("tag_name"));
        assertEquals(false, bodyJson.get("prerelease"));
        assertEquals("commitish", bodyJson.get("target_commitish"));
        assertEquals(true, bodyJson.get("draft"));
        assertEquals("tagName", bodyJson.get("name"));
        assertEquals("changelog", bodyJson.get("body"));
    }

    protected void executePlugin(HttpUrl url) throws Exception {
        File pom = getTestFile("src/main/test/resources/pom.xml");
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin",pom
        ));
        releaseMojo.githubReleasesUrl = url.toString();
        releaseMojo.windowsAsset = getTestFile("src/main/test/resources/windowsAsset.txt");
        releaseMojo.linuxAsset = getTestFile("src/main/test/resources/linuxAsset.txt");

        releaseMojo.execute();
    }

    protected void prepareMockingReleaseEffective(MockWebServer server) {
        JSONObject effectiveReleaseJsonResponse = new JSONObject();
        effectiveReleaseJsonResponse.put("draft",false);
        MockResponse releaseMockResponse = new MockResponse()
                .setResponseCode(200)
                .setBody(effectiveReleaseJsonResponse.toJSONString());
        server.enqueue(releaseMockResponse);
    }


}