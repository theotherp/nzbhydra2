package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.HttpUrl;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;
import org.codehaus.plexus.configuration.PlexusConfiguration;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class ReleaseMojoTest extends AbstractMojoTestCase {

    private ObjectMapper objectMapper = new ObjectMapper();

    public void setUp() throws Exception {
        super.setUp();
        Files.copy(getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.yaml.orig").toPath(), getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.yaml").toPath(), StandardCopyOption.REPLACE_EXISTING);
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
        releaseMojo.linuxAmd64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAmd64Asset.txt");
        releaseMojo.linuxArm64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxArm64Asset.txt");
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
        releaseMojo.linuxAmd64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAmd64Asset.txt");
        releaseMojo.linuxArm64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxArm64Asset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        try {
            releaseMojo.execute();
            fail("Expected mojo exception");
        } catch (MojoExecutionException e) {
            assertThat(e.getMessage()).contains("Latest changelog entry version v0.0.1 does not match tag name v1.0.0");
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
        releaseMojo.linuxAmd64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAmd64Asset.txt");
        releaseMojo.linuxArm64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxArm64Asset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        try {
            releaseMojo.execute();
            fail("Expected mojo exception");
        } catch (MojoExecutionException e) {
            assertThat(e.getMessage()).contains("GitHub Token and GitHub token file not set");
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
        releaseMojo.linuxAmd64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAmd64Asset.txt");
        releaseMojo.linuxArm64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxArm64Asset.txt");
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
        releaseMojo.linuxAmd64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAmd64Asset.txt");
        releaseMojo.linuxArm64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxArm64Asset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");

        releaseMojo.execute();

        assertThat(server.getRequestCount()).isEqualTo(0);
    }

    public void testReusesDraftReleaseOfPreviousRunAndSkipsCompletelyUploadedAssets() throws Exception {
        File windowsAssetFile = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");

        MockWebServer server = new MockWebServer();
        Release draftOfPreviousRun = new Release();
        draftOfPreviousRun.setTagName("v1.0.0");
        draftOfPreviousRun.setDraft(true);
        draftOfPreviousRun.setUploadUrl(server.url("/repos/theotherp/nzbhydra2/releases/1/assets").toString());
        draftOfPreviousRun.setAssetsUrl(server.url("/repos/theotherp/nzbhydra2/releases/1/assets").toString());
        draftOfPreviousRun.setUrl(server.url("/repos/theotherp/nzbhydra2/releases/1").toString());

        Asset completeWindowsAsset = new Asset();
        completeWindowsAsset.setName(windowsAssetFile.getName());
        completeWindowsAsset.setState("uploaded");
        completeWindowsAsset.setSize(windowsAssetFile.length());
        completeWindowsAsset.setUrl(server.url("/repos/theotherp/nzbhydra2/releases/assets/1").toString());

        Release effectiveReleaseResponse = new Release();
        effectiveReleaseResponse.setDraft(false);

        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(Collections.singletonList(draftOfPreviousRun)))); //Listing the existing releases
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(Collections.singletonList(completeWindowsAsset)))); //Listing the assets of the reused release
        server.enqueue(new MockResponse().setResponseCode(200)); //linux amd64 asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //linux arm64 asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //generic asset upload
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(effectiveReleaseResponse))); //Setting the release effective

        ReleaseMojo releaseMojo = getConfiguredMojo(server, "/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithToken.xml");
        releaseMojo.execute();

        assertThat(server.getRequestCount()).isEqualTo(6);
        server.takeRequest(2, TimeUnit.SECONDS); //Listing the releases
        server.takeRequest(2, TimeUnit.SECONDS); //Listing the assets
        //No request for the windows asset, it was already uploaded completely
        Set<String> uploadedAssetNames = new HashSet<>();
        for (int i = 0; i < 3; i++) {
            uploadedAssetNames.add(server.takeRequest(2, TimeUnit.SECONDS).getPath().replaceAll(".*assets\\?name=", ""));
        }
        assertThat(uploadedAssetNames).containsOnly("linuxAmd64Asset.txt", "linuxArm64Asset.txt", "genericAsset.txt");
    }

    public void testRetriesFailedUpload() throws Exception {
        MockWebServer server = new MockWebServer();
        Release draftReleaseResponse = new Release();
        draftReleaseResponse.setUploadUrl(server.url("/repos/theotherp/nzbhydra2/releases/1/assets").toString());
        draftReleaseResponse.setUrl(server.url("/repos/theotherp/nzbhydra2/releases/1").toString());
        draftReleaseResponse.setDraft(true);
        Release effectiveReleaseResponse = new Release();
        effectiveReleaseResponse.setDraft(false);

        server.enqueue(new MockResponse().setResponseCode(200).setBody("[]")); //Listing the existing releases
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(draftReleaseResponse)));
        server.enqueue(new MockResponse().setResponseCode(502)); //Windows asset upload, fails
        server.enqueue(new MockResponse().setResponseCode(200)); //Windows asset upload, retried
        server.enqueue(new MockResponse().setResponseCode(200)); //linux amd64 asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //linux arm64 asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //generic asset upload
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(effectiveReleaseResponse))); //Setting the release effective

        ReleaseMojo releaseMojo = getConfiguredMojo(server, "/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithToken.xml");
        releaseMojo.retryDelayMs = 0;

        releaseMojo.execute();

        assertThat(server.getRequestCount()).isEqualTo(8);
    }

    public void testFailsAfterTheLastUploadAttempt() throws Exception {
        MockWebServer server = new MockWebServer();
        Release draftReleaseResponse = new Release();
        draftReleaseResponse.setUploadUrl(server.url("/repos/theotherp/nzbhydra2/releases/1/assets").toString());
        draftReleaseResponse.setUrl(server.url("/repos/theotherp/nzbhydra2/releases/1").toString());
        draftReleaseResponse.setDraft(true);
        String draftReleaseJson = objectMapper.writeValueAsString(draftReleaseResponse);

        //Every upload fails, however often it is attempted
        server.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                if (request.getPath().contains("assets?name=")) {
                    return new MockResponse().setResponseCode(502);
                }
                if ("GET".equals(request.getMethod())) {
                    return new MockResponse().setResponseCode(200).setBody("[]");
                }
                return new MockResponse().setResponseCode(200).setBody(draftReleaseJson);
            }
        });

        ReleaseMojo releaseMojo = getConfiguredMojo(server, "/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithToken.xml");
        releaseMojo.retryDelayMs = 0;

        try {
            releaseMojo.execute();
            fail("Expected mojo exception");
        } catch (MojoExecutionException e) {
            assertThat(e.getMessage()).contains("Github returned code 502");
        }
    }

    public void testConsidersAnUploadTooSlowOnlyAfterTheGracePeriod() throws Exception {
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo.slowUploadThresholdMbPerSecond = 3.0;

        //Within the grace period nothing is too slow, however little was sent
        assertThat(releaseMojo.isTooSlow(1024, ReleaseMojo.GRACE_PERIOD_MS)).isFalse();

        long elapsed = ReleaseMojo.GRACE_PERIOD_MS + 1000;
        long fastEnough = (long) (4 * 1024 * 1024 * (elapsed / 1000d));
        long tooSlow = (long) (0.5 * 1024 * 1024 * (elapsed / 1000d));
        assertThat(releaseMojo.isTooSlow(fastEnough, elapsed)).isFalse();
        assertThat(releaseMojo.isTooSlow(tooSlow, elapsed)).isTrue();
    }

    public void testTheRemoteUploadIsOffUnlessItIsRequestedAndConfigured() throws Exception {
        File envFile = writeRemoteEnvFile();

        ReleaseMojo withoutFlag = new ReleaseMojo();
        withoutFlag.remoteUploadEnvFile = envFile;
        assertThat(withoutFlag.remoteUploadEnabled()).isFalse();

        ReleaseMojo withoutEnvFile = new ReleaseMojo();
        withoutEnvFile.useRemoteUpload = true;
        withoutEnvFile.remoteUploadEnvFile = new File("does/not/exist.env");
        assertThat(withoutEnvFile.remoteUploadEnabled()).isFalse();

        ReleaseMojo enabled = new ReleaseMojo();
        enabled.useRemoteUpload = true;
        enabled.remoteUploadEnvFile = envFile;
        assertThat(enabled.remoteUploadEnabled()).isTrue();
    }

    private File writeRemoteEnvFile() throws IOException {
        File envFile = File.createTempFile("remote", ".env");
        envFile.deleteOnExit();
        Files.write(envFile.toPath(), ("# Connection details\n"
                                       + "REMOTE_HOST=1.2.3.4\n"
                                       + "REMOTE_USER=build\n"
                                       + "REMOTE_KEY=~/.ssh/somekey\n"
                                       + "REMOTE_ADMIN_USER=ubuntu\n").getBytes(StandardCharsets.UTF_8));
        return envFile;
    }

    public void testReadsTheRemoteUploadSettingsFromTheEnvFile() throws Exception {
        File envFile = writeRemoteEnvFile();

        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo.remoteUploadEnvFile = envFile;

        assertThat(releaseMojo.remoteUploadSettings()).containsEntry("REMOTE_HOST", "1.2.3.4");
        assertThat(releaseMojo.remoteUploadSettings()).containsEntry("REMOTE_USER", "build");
        //The tilde is expanded because ssh gets the path as an argument, not through a shell
        assertThat(releaseMojo.remoteUploadSettings()).containsEntry("REMOTE_KEY", System.getProperty("user.home") + "/.ssh/somekey");
    }

    public void testWithoutAnEnvFileThereIsNoRemoteUploadHost() throws Exception {
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo.remoteUploadEnvFile = new File("does/not/exist.env");

        assertThat(releaseMojo.remoteUploadSettings()).isEmpty();
    }

    private ReleaseMojo getConfiguredMojo(MockWebServer server, String pomPath) throws Exception {
        File pom = getTestFile(pomPath);
        assertTrue(pom.exists());
        ReleaseMojo releaseMojo = new ReleaseMojo();
        releaseMojo = (ReleaseMojo) configureMojo(releaseMojo, extractPluginConfiguration("github-release-plugin", pom));
        releaseMojo.githubReleasesUrl = server.url("/repos/theotherp/nzbhydra2/releases").toString();
        releaseMojo.windowsAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        releaseMojo.linuxAmd64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxAmd64Asset.txt");
        releaseMojo.linuxArm64Asset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/linuxArm64Asset.txt");
        releaseMojo.genericAsset = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/genericAsset.txt");
        return releaseMojo;
    }

    protected void verifyExecution(MockWebServer server) throws InterruptedException, IOException {
        //Creating the release
        verifyDraftReleaseIsCreated(server);

        //Uploading the assets, which happens in parallel, so the order in which they arrive is not defined
        Map<String, RecordedRequest> uploadsByAssetName = new HashMap<>();
        for (int i = 0; i < 4; i++) {
            RecordedRequest uploadRequest = server.takeRequest(2, TimeUnit.SECONDS);
            assertThat("token token").isEqualTo(uploadRequest.getHeader("Authorization"));
            uploadsByAssetName.put(uploadRequest.getPath().replaceAll(".*assets\\?name=", ""), uploadRequest);
        }
        assertThat(uploadsByAssetName.keySet()).containsOnly("windowsAsset.txt", "linuxAmd64Asset.txt", "linuxArm64Asset.txt", "genericAsset.txt");

        //The assets are sent through a request body that logs the progress, so make sure it sends the file completely
        File windowsAssetFile = getTestFile("src/test/resources/org/nzbhydra/github/mavenreleaseplugin/windowsAsset.txt");
        RecordedRequest windowsAssetUploadRequest = uploadsByAssetName.get("windowsAsset.txt");
        assertThat(windowsAssetUploadRequest.getHeader("Content-Length")).isEqualTo(String.valueOf(windowsAssetFile.length()));
        assertThat(windowsAssetUploadRequest.getBody().readByteArray()).isEqualTo(Files.readAllBytes(windowsAssetFile.toPath()));

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
        server.enqueue(new MockResponse().setResponseCode(200).setBody("[]")); //Listing the existing releases
        MockResponse releaseMockResponse = new MockResponse()
            .setResponseCode(200)
            .setBody(objectMapper.writeValueAsString(draftReleaseResponse));
        server.enqueue(releaseMockResponse);
        server.enqueue(new MockResponse().setResponseCode(200)); //Windows asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //generic asset upload
        server.enqueue(new MockResponse().setResponseCode(200)); //Linux asset 1 upload
        server.enqueue(new MockResponse().setResponseCode(200)); //Linux asset 2 upload
        server.enqueue(new MockResponse().setResponseCode(200).setBody(objectMapper.writeValueAsString(effectiveReleaseResponse))); //Setting the release effective
        return server;
    }


    protected void verifyDraftReleaseIsCreated(MockWebServer server) throws InterruptedException, IOException {
        RecordedRequest listRequest = server.takeRequest(2, TimeUnit.SECONDS);
        assertEquals("GET", listRequest.getMethod());

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
