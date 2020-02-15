package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;


@SuppressWarnings("unchecked")
@Mojo(name = "set-final",
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class SetReleaseFinalMojo extends AbstractMojo {

    @Parameter(property = "changelogJsonFile", required = true)
    protected File changelogJsonFile;

    @Parameter(property = "githubTokenFile", required = false)
    protected File githubTokenFile;

    @Parameter(property = "githubToken", required = false)
    protected String githubToken;

    @Parameter(property = "githubReleasesUrl", required = true)
    protected String githubReleasesUrl;

    protected String version = System.getProperty("finalVersion");

    private ObjectMapper objectMapper = new ObjectMapper();
    private OkHttpClient client;

    @Override
    public void execute() throws MojoExecutionException {
        if (Strings.isNullOrEmpty(version)) {
            throw new MojoExecutionException("Version property is empty");
        }

        if (githubTokenFile != null && githubTokenFile.exists()) {
            try {
                githubToken = new String(Files.readAllBytes(githubTokenFile.toPath()));
            } catch (IOException e) {
                throw new MojoExecutionException("Unable to read token.txt", e);
            }
        }

        client = new OkHttpClient.Builder().readTimeout(25, TimeUnit.SECONDS).connectTimeout(25, TimeUnit.SECONDS).build();
        if (!changelogJsonFile.exists()) {
            throw new MojoExecutionException("JSON file does not exist: " + changelogJsonFile.getAbsolutePath());
        }
        getLog().info("Will set version " + version + " to final");

        List<ChangelogVersionEntry> entries;
        try {
            entries = objectMapper.readValue(Files.readAllBytes(changelogJsonFile.toPath()), new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to read JSON file", e);
        }
        Collections.sort(entries);
        Collections.reverse(entries);

        Optional<ChangelogVersionEntry> latestChangelogEntry = entries.stream().filter(x -> new SemanticVersion(x.getVersion()).equals(new SemanticVersion(version))).findFirst();
        if (!latestChangelogEntry.isPresent()) {
            throw new MojoExecutionException("Unable to find entry with tag name " + version);
        }
        latestChangelogEntry.get().setFinal(true);

        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(changelogJsonFile, entries);
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to update json file " + changelogJsonFile.getAbsolutePath(), e);
        }


        org.nzbhydra.github.mavenreleaseplugin.Release release;
        String url = githubReleasesUrl + "/tags/" + version;
        getLog().info("Calling URL " + url);
        Request.Builder callBuilder = new Request.Builder().url(url);
        callBuilder.header("Authorization", "token " + githubToken);
        try (Response response = client.newCall(callBuilder.build()).execute()) {
            if (!response.isSuccessful()) {
                throw new MojoExecutionException("Unable to find release with tag name " + version + ": " + response.message());
            }
            try (ResponseBody body = response.body()) {
                release = objectMapper.readValue(body.string(), org.nzbhydra.github.mavenreleaseplugin.Release.class);

            }
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to find release with tag name " + version + ". " + e);
        }

        org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest = new org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest();
        releaseRequest.setTagName(release.getTagName());
        releaseRequest.setTargetCommitish(release.getTargetCommitish());
        releaseRequest.setName(release.getName());
        releaseRequest.setBody(Joiner.on("\n\n").join(ChangelogGeneratorMojo.getMarkdownLinesFromEntry(latestChangelogEntry.get())));
        releaseRequest.setDraft(false);
        releaseRequest.setPrerelease(false);

        try {
            setReleaseFinal(releaseRequest, release);
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to set release to final: " + e);
        }

    }

    private void setReleaseFinal(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest, org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        getLog().info("Setting release final");
        releaseRequest.setPrerelease(false);
        getLog().info("Calling URL " + release.getUrl());
        Request.Builder requestBuilder = new Request.Builder().url(release.getUrl()).patch(RequestBody.create(MediaType.parse("application/json"), objectMapper.writeValueAsString(releaseRequest)));
        requestBuilder.header("Authorization", "token " + githubToken);
        Call call = client.newCall(requestBuilder.build());
        Response response = call.execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to set release final Github returned code " + response.code() + " and message: " + response.message());
        }
        String body = response.body().string();
        response.body().close();
        try {
            org.nzbhydra.github.mavenreleaseplugin.Release effectiveRelease = objectMapper.readValue(body, org.nzbhydra.github.mavenreleaseplugin.Release.class);
            if (effectiveRelease.isPrerelease()) {
                getLog().error("Release is still prerelease");
            } else {
                getLog().info("Successfully set release final");
            }
        } catch (Exception e) {
            throw new MojoExecutionException("Unable to parse GitHub's release edit response: " + body, e);
        }

    }


}
