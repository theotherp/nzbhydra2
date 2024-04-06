package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request.Builder;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.apache.maven.execution.MavenSession;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;


@SuppressWarnings("unchecked")
@Mojo(name = "release",
        requiresOnline = true, //Obviously
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class ReleaseMojo extends AbstractMojo {

    private OkHttpClient client;


    @Parameter(property = "githubToken", required = false)
    protected String githubToken;

    @Parameter(property = "githubTokenFile", required = false)
    protected File githubTokenFile;

    @Parameter(property = "tagName", required = true)
    protected String tagName;

    @Parameter(property = "commitish", required = true)
    protected String commitish;

    @Parameter(property = "windowsAsset", required = true)
    protected File windowsAsset;

    @Parameter(property = "linuxAmd64Asset", required = true)
    protected File linuxAmd64Asset;

    @Parameter(property = "linuxArm64Asset", required = true)
    protected File linuxArm64Asset;

    @Parameter(property = "genericAsset", required = true)
    protected File genericAsset;

    @Parameter(property = "changelogYamlFile", required = true)
    protected File changelogYamlFile;

    @Parameter(property = "windowsExecutable", required = false)
    protected File windowsExecutable;
    @Parameter(property = "windowsConsoleExecutable", required = false)
    protected File windowsConsoleExecutable;
    @Parameter(property = "py3", required = false)
    protected File py3;
    @Parameter(property = "goWrapper", required = false)
    protected File goWrapper;
    @Parameter(property = "skipExecutablesCheck", required = false)
    protected boolean skipExecutablesCheck;

    @Parameter(property = "dryRun")
    protected boolean dryRun;

    @Parameter(defaultValue = "${session}", readonly = true)
    private MavenSession mavenSession;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    protected String githubReleasesUrl;


    @Override
    public void execute() throws MojoExecutionException {
        if (dryRun) {
            getLog().info("Dry run");
        }
        client = new OkHttpClient.Builder().readTimeout(25, TimeUnit.SECONDS).connectTimeout(25, TimeUnit.SECONDS).build();
        if (githubReleasesUrl == null) {
            if (System.getenv("githubReleasesUrl") != null) {
                githubReleasesUrl = System.getenv("githubReleasesUrl");
            } else if (System.getProperty("githubReleasesUrl") != null) {
                githubReleasesUrl = System.getProperty("githubReleasesUrl");
            } else {
                throw new MojoExecutionException("githubReleasesUrl not set anywhere");
            }
        }

        getLog().info("Will release version " + tagName + " to GitHub");

        executePrechecks();
        if (!windowsAsset.exists()) {
            throw new MojoExecutionException("Unable to find windows asset at " + windowsAsset.getAbsolutePath());
        }

        if (!linuxAmd64Asset.exists()) {
            throw new MojoExecutionException("Unable to find linux amd64 asset at " + linuxAmd64Asset.getAbsolutePath());
        }

        if (!linuxArm64Asset.exists()) {
            throw new MojoExecutionException("Unable to find linux arm64 asset at " + linuxArm64Asset.getAbsolutePath());
        }

        if (!genericAsset.exists()) {
            throw new MojoExecutionException("Unable to find generic asset at " + genericAsset.getAbsolutePath());
        }

        if (githubTokenFile != null && githubTokenFile.exists()) {
            try {
                githubToken = new String(Files.readAllBytes(githubTokenFile.toPath()));
            } catch (IOException e) {
                throw new MojoExecutionException("Unable to read token.txt", e);
            }
        }

        getLog().info("Will use windows asset " + windowsAsset.getAbsolutePath());
        getLog().info("Will use linux amd64 asset " + linuxAmd64Asset.getAbsolutePath());
        getLog().info("Will use linux arm64 asset " + linuxArm64Asset.getAbsolutePath());
        getLog().info("Will use generic asset " + genericAsset.getAbsolutePath());
        getLog().info("Will use changelog entry from " + changelogYamlFile.getAbsolutePath());

        try {
            org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest = new org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest();
            releaseRequest.setTagName(tagName);
            releaseRequest.setName(tagName);
            releaseRequest.setDraft(true);
            releaseRequest.setPrerelease(!getChangelogVersionEntry().isFinal());
            releaseRequest.setTargetCommitish(commitish);
            setChangelogBody(releaseRequest);

            org.nzbhydra.github.mavenreleaseplugin.Release releaseResponseObject = createRelease(releaseRequest);
            uploadAssets(releaseResponseObject);

            setReleaseEffective(releaseRequest, releaseResponseObject);

        } catch (IOException e) {
            throw new MojoExecutionException("Error releasing", e);
        }
    }

    protected void executePrechecks() throws MojoExecutionException {
        if (Strings.isNullOrEmpty(githubToken)) {
            if (githubTokenFile == null) {
                throw new MojoExecutionException("GitHub Token and GitHub token file not set");
            } else if (!githubTokenFile.exists()) {
                throw new MojoExecutionException("GitHub Token not set and " + githubTokenFile.getAbsolutePath() + " doesn't exist");
            }
        }

        if (!changelogYamlFile.exists()) {
            throw new MojoExecutionException("JSON file does not exist: " + changelogYamlFile.getAbsolutePath());
        }

        if (skipExecutablesCheck) {
            return;
        }
        try {
            verifyIsYounger(windowsExecutable, goWrapper);
            verifyIsYounger(windowsConsoleExecutable, goWrapper);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    private void verifyIsYounger(File file, File youngerThanThis) throws IOException, MojoExecutionException {
        final Instant fileTime = Files.readAttributes(file.toPath(), BasicFileAttributes.class).lastModifiedTime().toInstant();
        final Instant youngerThanThisTime = Files.readAttributes(youngerThanThis.toPath(), BasicFileAttributes.class).lastModifiedTime().toInstant();
        if (fileTime.isBefore(youngerThanThisTime)) {
            throw new MojoExecutionException("Creation date of " + file + " is older than that of " + youngerThanThis);
        } else {
            getLog().info(file + " is younger than " + youngerThanThis);
        }
    }

    protected void setChangelogBody(ReleaseRequest releaseRequest) throws MojoExecutionException {
        ChangelogVersionEntry latestEntry = getChangelogVersionEntry();
        releaseRequest.setBody(Joiner.on("\n\n").join(ChangelogGeneratorMojo.getMarkdownLinesFromEntry(latestEntry)));
    }

    protected ChangelogVersionEntry getChangelogVersionEntry() throws MojoExecutionException {
        List<ChangelogVersionEntry> entries;
        try {
            entries = yamlMapper.readValue(Files.readAllBytes(changelogYamlFile.toPath()), new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to read JSON file", e);
        }
        Collections.sort(entries);
        Collections.reverse(entries);
        ChangelogVersionEntry latestEntry = entries.get(0);
        if (!new SemanticVersion(latestEntry.getVersion()).equals(new SemanticVersion(tagName))) {
            throw new MojoExecutionException("Latest changelog entry version " + latestEntry.getVersion() + " does not match tag name " + tagName);
        }
        return latestEntry;
    }

    private org.nzbhydra.github.mavenreleaseplugin.Release createRelease(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest) throws IOException, MojoExecutionException {
        getLog().info("Creating release in draft mode using base URL " + githubReleasesUrl);
        String requestBody = objectMapper.writeValueAsString(releaseRequest);
        getLog().info("Sending body to create release: " + requestBody);
        if (!dryRun) {
            Builder callBuilder = new Builder().url(githubReleasesUrl).post(RequestBody.create(MediaType.parse("application/json"), requestBody));
            callBuilder.header("Authorization", "token " + githubToken);
            Call call = client.newCall(callBuilder.build());
            Response response = call.execute();
            if (!response.isSuccessful() || response.body() == null) {
                throw new MojoExecutionException("When trying to create release with URL " + githubReleasesUrl + " Github returned code " + response.code() + " and message: " + response.message());
            }
            String body = response.body().string();
            response.body().close();
            try {
                return objectMapper.readValue(body, org.nzbhydra.github.mavenreleaseplugin.Release.class);
            } catch (Exception e) {
                throw new MojoExecutionException("Unable to parse GitHub's release response: " + body, e);
            } finally {
                getLog().info("Successfully created release");
            }
        } else {
            getLog().info("Skipping POST of release because of dry run");
            final Release release = new Release();
            release.setUploadUrl("dryRunUploadUrl");
            return release;
        }
    }

    private void uploadAssets(org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        String uploadUrl = release.getUploadUrl();
        uploadUrl = uploadUrl.replace("{?name,label}", "");

        String name = windowsAsset.getName();
        getLog().info("Uploading windows asset to " + uploadUrl);

        Response response ;
        if (!dryRun) {
            try {
                Builder callBuilder = new Builder().header("Content-Length", String.valueOf(windowsAsset.length())).url(uploadUrl + "?name=" + name);
                callBuilder.header("Authorization", "token " + githubToken);
                response = client.newCall(callBuilder
                    .post(
                        RequestBody.create(MediaType.parse("application/zip"), windowsAsset))
                    .build()).execute();
                getLog().info("Successfully uploaded windows asset");
                if (!response.isSuccessful()) {
                    throw new MojoExecutionException("When trying to upload windows asset Github returned code " + response.code() + " and message: " + response.message());
                }
            } catch (IOException e) {
                getLog().error("Error while uploading windows asset", e);
                throw new MojoExecutionException("When trying to upload windows asset the following error occurred: " + e.getMessage());
            }
        } else {
            getLog().info("Skipping upload of windows asset because of dry run");
        }


        getLog().info("Uploading linux amd64 asset to " + uploadUrl);
        name = linuxAmd64Asset.getName();
        if (!dryRun) {

            try {
                Builder callBuilder = new Builder().header("Content-Length", String.valueOf(linuxAmd64Asset.length())).url(uploadUrl + "?name=" + name);
                callBuilder.header("Authorization", "token " + githubToken);
                response = client.newCall(callBuilder
                        .post(
                                RequestBody.create(MediaType.parse("application/gzip"), linuxAmd64Asset))
                        .build()).execute();
                if (!response.isSuccessful()) {
                    throw new MojoExecutionException("When trying to upload linux amd64 asset Github returned code " + response.code() + " and message: " + response.message());
                }
                getLog().info("Successfully uploaded linux amd64 asset");
            } catch (IOException e) {
                getLog().error("Error while uploading linux amd64 asset", e);
                throw new MojoExecutionException("When trying to upload linux amd64 asset the following error occurred: " + e.getMessage());
            }
        } else {
            getLog().info("Skipping upload of linux amd64 asset because of dry run");
        }

        getLog().info("Uploading linux arm64 asset to " + uploadUrl);
        name = linuxArm64Asset.getName();
        if (!dryRun) {

            try {
                Builder callBuilder = new Builder().header("Content-Length", String.valueOf(linuxArm64Asset.length())).url(uploadUrl + "?name=" + name);
                callBuilder.header("Authorization", "token " + githubToken);
                response = client.newCall(callBuilder
                    .post(
                        RequestBody.create(MediaType.parse("application/gzip"), linuxArm64Asset))
                    .build()).execute();
                if (!response.isSuccessful()) {
                    throw new MojoExecutionException("When trying to upload linux arm64 asset Github returned code " + response.code() + " and message: " + response.message());
                }
                getLog().info("Successfully uploaded linux asset");
            } catch (IOException e) {
                getLog().error("Error while uploading linux asset", e);
                throw new MojoExecutionException("When trying to upload linux arm64 asset the following error occurred: " + e.getMessage());
            }
        } else {
            getLog().info("Skipping upload of linux arm64 asset because of dry run");
        }

        getLog().info("Uploading generic asset to " + uploadUrl);
        if (!dryRun) {
            name = genericAsset.getName();
            try {
                Builder callBuilder = new Builder().header("Content-Length", String.valueOf(genericAsset.length())).url(uploadUrl + "?name=" + name);
                callBuilder.header("Authorization", "token " + githubToken);
                response = client.newCall(callBuilder
                    .post(
                        RequestBody.create(MediaType.parse("application/gzip"), genericAsset))
                    .build()).execute();
                if (!response.isSuccessful()) {
                    throw new MojoExecutionException("When trying to upload generic asset Github returned code " + response.code() + " and message: " + response.message());
                }
                getLog().info("Successfully uploaded generic asset");
            } catch (IOException e) {
                getLog().error("Error while uploading generic asset", e);
                throw new MojoExecutionException("When trying to upload generic asset the following error occurred: " + e.getMessage());
            }
        } else {
            getLog().info("Skipping upload of generic asset because of dry run");
        }
    }


    private void setReleaseEffective(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest, org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        getLog().info("Setting release effective");
        if (!dryRun) {

            releaseRequest.setDraft(false);
            Builder callBuilder = new Builder().url(release.getUrl()).patch(RequestBody.create(MediaType.parse("application/json"), objectMapper.writeValueAsString(releaseRequest)));
            callBuilder.header("Authorization", "token " + githubToken);
            Call call = client.newCall(callBuilder.build());
            Response response = call.execute();
            if (!response.isSuccessful()) {
                throw new MojoExecutionException("When trying to set release effective Github returned code " + response.code() + " and message: " + response.message());
            }
            String body = response.body().string();
            response.body().close();
            try {
                org.nzbhydra.github.mavenreleaseplugin.Release effectiveRelease = objectMapper.readValue(body, org.nzbhydra.github.mavenreleaseplugin.Release.class);
                if (effectiveRelease.isDraft()) {
                    getLog().error("Release is still in state 'draft'");
                } else {
                    getLog().info("Successfully set release effective");
                }
            } catch (Exception e) {
                throw new MojoExecutionException("Unable to parse GitHub's release edit response: " + body, e);
            }
        } else {
            getLog().info("Skipping setting release effective because of dry run");
        }

    }


}
