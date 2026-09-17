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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;


@SuppressWarnings("unchecked")
@Mojo(name = "release",
        requiresOnline = true, //Obviously
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class ReleaseMojo extends AbstractMojo {

    private static final int MAX_UPLOAD_ATTEMPTS = 3;

    //Not final so that tests don't have to wait
    protected long retryDelayMs = 10_000;

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
        //The assets are about 100 MB each. Uploading one takes minutes and GitHub only sends the response headers
        //once it has processed the whole upload, so the read timeout has to cover that as well.
        client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.MINUTES)
            .readTimeout(10, TimeUnit.MINUTES)
            .build();
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

            org.nzbhydra.github.mavenreleaseplugin.Release releaseResponseObject = createOrReuseDraftRelease(releaseRequest);
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
        if (latestEntry.getDate() == null) {
            throw new MojoExecutionException("Date missing in changelog entry");
        }
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

    private org.nzbhydra.github.mavenreleaseplugin.Release createOrReuseDraftRelease(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest) throws IOException, MojoExecutionException {
        if (!dryRun) {
            org.nzbhydra.github.mavenreleaseplugin.Release existingDraft = findExistingDraftRelease();
            if (existingDraft != null) {
                getLog().info("Reusing draft release " + existingDraft.getUrl() + " left over from a previous run");
                return existingDraft;
            }
        }
        return createRelease(releaseRequest);
    }

    private org.nzbhydra.github.mavenreleaseplugin.Release findExistingDraftRelease() throws IOException, MojoExecutionException {
        Builder callBuilder = new Builder().url(githubReleasesUrl).get();
        callBuilder.header("Authorization", "token " + githubToken);
        try (Response response = client.newCall(callBuilder.build()).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new MojoExecutionException("When trying to list the existing releases Github returned code " + response.code() + " and message: " + response.message());
            }
            List<org.nzbhydra.github.mavenreleaseplugin.Release> releases = objectMapper.readValue(response.body().string(), new TypeReference<List<org.nzbhydra.github.mavenreleaseplugin.Release>>() {
            });
            for (org.nzbhydra.github.mavenreleaseplugin.Release release : releases) {
                if (Boolean.TRUE.equals(release.isDraft()) && tagName.equals(release.getTagName())) {
                    return release;
                }
            }
        }
        return null;
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
        String uploadUrl = release.getUploadUrl().replace("{?name,label}", "");
        Map<String, Asset> existingAssets = getExistingAssets(release);

        uploadAsset(release, uploadUrl, existingAssets, "windows", windowsAsset, "application/zip");
        uploadAsset(release, uploadUrl, existingAssets, "linux amd64", linuxAmd64Asset, "application/gzip");
        uploadAsset(release, uploadUrl, existingAssets, "linux arm64", linuxArm64Asset, "application/gzip");
        uploadAsset(release, uploadUrl, existingAssets, "generic", genericAsset, "application/gzip");
    }

    /**
     * The assets already attached to the release, by name. Only ever contains anything when a draft release of a
     * previous, failed run is reused.
     */
    private Map<String, Asset> getExistingAssets(org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        Map<String, Asset> assetsByName = new HashMap<>();
        if (dryRun || release.getAssetsUrl() == null) {
            return assetsByName;
        }
        Builder callBuilder = new Builder().url(release.getAssetsUrl()).get();
        callBuilder.header("Authorization", "token " + githubToken);
        try (Response response = client.newCall(callBuilder.build()).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new MojoExecutionException("When trying to list the assets of the release Github returned code " + response.code() + " and message: " + response.message());
            }
            List<Asset> assets = objectMapper.readValue(response.body().string(), new TypeReference<List<Asset>>() {
            });
            for (Asset asset : assets) {
                assetsByName.put(asset.getName(), asset);
            }
        }
        return assetsByName;
    }

    private void uploadAsset(org.nzbhydra.github.mavenreleaseplugin.Release release, String uploadUrl, Map<String, Asset> existingAssets, String description, File asset, String mediaType) throws MojoExecutionException {
        if (dryRun) {
            getLog().info("Skipping upload of " + description + " asset because of dry run");
            return;
        }
        String name = asset.getName();
        Asset existingAsset = existingAssets.remove(name);
        if (existingAsset != null) {
            if ("uploaded".equals(existingAsset.getState()) && Long.valueOf(asset.length()).equals(existingAsset.getSize())) {
                getLog().info("Skipping upload of " + description + " asset because it was already uploaded completely");
                return;
            }
            getLog().info("Deleting incompletely uploaded " + description + " asset of a previous run");
            deleteAsset(existingAsset);
        }

        for (int attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
            getLog().info("Uploading " + description + " asset to " + uploadUrl + (attempt > 1 ? " (attempt " + attempt + " of " + MAX_UPLOAD_ATTEMPTS + ")" : ""));
            Builder callBuilder = new Builder().url(uploadUrl + "?name=" + name);
            callBuilder.header("Authorization", "token " + githubToken);
            callBuilder.post(RequestBody.create(MediaType.parse(mediaType), asset));
            String error;
            try (Response response = client.newCall(callBuilder.build()).execute()) {
                if (response.isSuccessful()) {
                    getLog().info("Successfully uploaded " + description + " asset");
                    return;
                }
                error = "Github returned code " + response.code() + " and message: " + response.message();
                if (response.code() < 500) {
                    throw new MojoExecutionException("When trying to upload " + description + " asset " + error);
                }
            } catch (IOException e) {
                error = "the following error occurred: " + e.getMessage();
                getLog().error("Error while uploading " + description + " asset", e);
            }
            if (attempt == MAX_UPLOAD_ATTEMPTS) {
                throw new MojoExecutionException("When trying to upload " + description + " asset " + error);
            }
            getLog().warn("Upload of " + description + " asset failed, retrying in " + (retryDelayMs / 1000) + " seconds");
            //GitHub may have stored a partial asset under that name, which would make the next attempt fail with 422
            deleteAssetByName(release, name);
            try {
                Thread.sleep(retryDelayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new MojoExecutionException("Interrupted while waiting to retry the upload of the " + description + " asset");
            }
        }
    }

    private void deleteAssetByName(org.nzbhydra.github.mavenreleaseplugin.Release release, String name) throws MojoExecutionException {
        if (release.getAssetsUrl() == null) {
            return;
        }
        Builder callBuilder = new Builder().url(release.getAssetsUrl()).get();
        callBuilder.header("Authorization", "token " + githubToken);
        try (Response response = client.newCall(callBuilder.build()).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                getLog().warn("Unable to list the assets of the release before retrying, Github returned code " + response.code());
                return;
            }
            List<Asset> assets = objectMapper.readValue(response.body().string(), new TypeReference<List<Asset>>() {
            });
            for (Asset asset : assets) {
                if (name.equals(asset.getName())) {
                    deleteAsset(asset);
                }
            }
        } catch (IOException e) {
            getLog().warn("Unable to delete the partially uploaded asset " + name + ": " + e.getMessage());
        }
    }

    private void deleteAsset(Asset asset) throws MojoExecutionException {
        Builder callBuilder = new Builder().url(asset.getUrl()).delete();
        callBuilder.header("Authorization", "token " + githubToken);
        try (Response response = client.newCall(callBuilder.build()).execute()) {
            if (!response.isSuccessful()) {
                throw new MojoExecutionException("When trying to delete the asset " + asset.getName() + " Github returned code " + response.code() + " and message: " + response.message());
            }
        } catch (IOException e) {
            throw new MojoExecutionException("When trying to delete the asset " + asset.getName() + " the following error occurred: " + e.getMessage());
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
