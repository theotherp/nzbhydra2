package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import okhttp3.*;
import okhttp3.Request.Builder;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
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

    @Parameter(property = "githubReleasesUrl", required = true)
    protected String githubReleasesUrl;

    @Parameter(property = "tagName", required = true)
    protected String tagName;

    @Parameter(property = "commitish", required = true)
    protected String commitish;

    @Parameter(property = "windowsAsset", required = true)
    protected File windowsAsset;

    @Parameter(property = "linuxAsset", required = true)
    protected File linuxAsset;

    @Parameter(property = "changelogJsonFile", required = true)
    protected File changelogJsonFile;

    private ObjectMapper objectMapper = new ObjectMapper();


    @Override
    public void execute() throws MojoExecutionException {
        client = new OkHttpClient.Builder().readTimeout(25, TimeUnit.SECONDS).connectTimeout(25, TimeUnit.SECONDS).build();

        getLog().info("Will release version " + tagName + " to GitHub");

        executePrechecks();
        if (!windowsAsset.exists()) {
            throw new MojoExecutionException("Unable to find windows asset at " + windowsAsset.getAbsolutePath());
        }

        if (!linuxAsset.exists()) {
            throw new MojoExecutionException("Unable to find linux asset at " + linuxAsset.getAbsolutePath());
        }

        if (githubTokenFile != null && githubTokenFile.exists()) {
            try {
                githubToken = new String(Files.readAllBytes(githubTokenFile.toPath()));
            } catch (IOException e) {
                throw new MojoExecutionException("Unable to read token.txt", e);
            }
        }


        getLog().info("Will use windows asset " + windowsAsset.getAbsolutePath());
        getLog().info("Will use linux asset " + linuxAsset.getAbsolutePath());
        getLog().info("Will use changelog entry from " + changelogJsonFile.getAbsolutePath());

        try {
            org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest = new org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest();
            releaseRequest.setTagName(tagName);
            releaseRequest.setName(tagName);
            releaseRequest.setDraft(true);
            releaseRequest.setPrerelease(false);
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

        if (!changelogJsonFile.exists()) {
            throw new MojoExecutionException("JSON file does not exist: " + changelogJsonFile.getAbsolutePath());
        }
    }

    protected void setChangelogBody(ReleaseRequest releaseRequest) throws MojoExecutionException {
        ChangelogVersionEntry latestEntry = getChangelogVersionEntry();
        releaseRequest.setBody(Joiner.on("\n").join(ChangelogGeneratorMojo.getMarkdownLinesFromEntry(latestEntry)));
    }

    protected ChangelogVersionEntry getChangelogVersionEntry() throws MojoExecutionException {
        List<ChangelogVersionEntry> entries;
        try {
            entries = objectMapper.readValue(Files.readAllBytes(changelogJsonFile.toPath()), new TypeReference<List<ChangelogVersionEntry>>() {
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
        String url = githubReleasesUrl + "?access_token=" + githubToken;
        String requestBody = objectMapper.writeValueAsString(releaseRequest);
        Call call = client.newCall(new Builder().url(url).post(RequestBody.create(MediaType.parse("application/json"), requestBody)).build());
        Response response = call.execute();
        if (!response.isSuccessful() || response.body() == null) {
            throw new MojoExecutionException("When trying to create release with URL " + url + " Github returned code " + response.code() + " and message: " + response.message());
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
    }

    private void uploadAssets(org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        String uploadUrl = release.getUploadUrl();
        uploadUrl = uploadUrl.replace("{?name,label}", "");

        String name = windowsAsset.getName();
        getLog().info("Uploading windows asset to " + uploadUrl);

        Response response = null;
        try {
            response = client.newCall(new Builder().header("Content-Length", String.valueOf(windowsAsset.length())).url(uploadUrl + "?name=" + name + "&access_token=" + githubToken)
                    .post(
                            RequestBody.create(MediaType.parse("application/zip"), windowsAsset))
                    .build()).execute();
            getLog().info("Successfully uploaded windows asset");
            if (!response.isSuccessful()) {
                throw new MojoExecutionException("When trying to upload windows asset Github returned code " + response.code() + " and message: " + response.message());
            }
        } catch (IOException e) {
            getLog().error("Error while uploading windows asset", e);
        }


        getLog().info("Uploading linux asset to " + uploadUrl);
        name = linuxAsset.getName();
        try {
            response = client.newCall(new Builder().header("Content-Length", String.valueOf(linuxAsset.length())).url(uploadUrl + "?name=" + name + "&access_token=" + githubToken)
                    .post(
                            RequestBody.create(MediaType.parse("application/gzip"), linuxAsset))
                    .build()).execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to upload linux asset Github returned code " + response.code() + " and message: " + response.message());
        }
        getLog().info("Successfully uploaded linux asset");
        } catch (IOException e) {
            getLog().error("Error while uploading linux asset", e);
        }
    }


    private void setReleaseEffective(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest, org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        getLog().info("Setting release effective");
        releaseRequest.setDraft(false);
        String url = release.getUrl() + "?access_token=" + githubToken;
        Call call = client.newCall(new Builder().url(url).patch(RequestBody.create(MediaType.parse("application/json"), objectMapper.writeValueAsString(releaseRequest))).build());
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

    }


}
