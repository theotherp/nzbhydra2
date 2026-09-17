package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request.Builder;
import okhttp3.RequestBody;
import okhttp3.Response;
import okio.Buffer;
import okio.BufferedSink;
import okio.Okio;
import okio.Source;
import org.apache.maven.execution.MavenSession;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
    protected static long GRACE_PERIOD_MS = 20_000;

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

    /**
     * Whether a slow upload is aborted and sent from the remote upload host instead. Off unless -DuseRemoteUpload is
     * given, because GitHub's upload endpoint is not reliably slow: at times it is just as slow from the remote host.
     */
    @Parameter(property = "useRemoteUpload", defaultValue = "false")
    protected boolean useRemoteUpload;

    /**
     * An upload running slower than this is aborted and, if the remote upload is enabled, retried from there.
     * GitHub's proxy answers a request that takes more than a couple of minutes with 504, so a 100 MB asset has to be
     * sent at a few MB/s to arrive at all.
     */
    @Parameter(property = "slowUploadThresholdMbPerSecond", defaultValue = "3.0")
    protected double slowUploadThresholdMbPerSecond;

    /**
     * Env file with the connection details of the host the assets are uploaded from when the direct upload is too
     * slow, in the format of misc/buildLinuxCore/arm64/remote.env (REMOTE_HOST, REMOTE_USER, REMOTE_KEY). Without it
     * a slow upload is simply retried.
     */
    @Parameter(property = "remoteUploadEnvFile", required = false)
    protected File remoteUploadEnvFile;

    @Parameter(defaultValue = "${session}", readonly = true)
    private MavenSession mavenSession;

    private Map<String, String> remoteUploadEnv;
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
            //Over HTTP/2 this okhttp version waits for a window update after every frame, which limits the upload to a
            //few hundred KB/s no matter how much bandwidth is available
            .protocols(Collections.singletonList(Protocol.HTTP_1_1))
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
        if (remoteUploadEnabled()) {
            getLog().info(String.format("Uploads running slower than %.1f MB/s will be aborted and sent from the remote upload host instead", slowUploadThresholdMbPerSecond));
            getLog().debug("Remote upload host is " + remoteUploadHost());
        } else if (useRemoteUpload) {
            getLog().warn("Remote upload requested but no remote upload host is configured, uploading directly");
        } else {
            getLog().info("Uploading directly. Use -DuseRemoteUpload to send uploads that run slower than "
                          + String.format("%.1f", slowUploadThresholdMbPerSecond) + " MB/s from the remote upload host instead");
        }

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

        //All four assets are zip files, whatever their name says
        List<Callable<Void>> uploads = new ArrayList<>();
        addUpload(uploads, release, uploadUrl, existingAssets, "windows", windowsAsset, "application/zip");
        addUpload(uploads, release, uploadUrl, existingAssets, "linux amd64", linuxAmd64Asset, "application/zip");
        addUpload(uploads, release, uploadUrl, existingAssets, "linux arm64", linuxArm64Asset, "application/zip");
        addUpload(uploads, release, uploadUrl, existingAssets, "generic", genericAsset, "application/zip");
        runUploads(uploads);
    }

    /**
     * Adds an upload of the asset unless it is already attached to the release completely. An incompletely uploaded
     * asset of a previous run is deleted first.
     */
    private void addUpload(List<Callable<Void>> uploads, org.nzbhydra.github.mavenreleaseplugin.Release release, String uploadUrl, Map<String, Asset> existingAssets, String description, File asset, String mediaType) throws MojoExecutionException {
        if (dryRun) {
            getLog().info("Skipping upload of " + description + " asset because of dry run");
            return;
        }
        Asset existingAsset = existingAssets.remove(asset.getName());
        if (existingAsset != null) {
            if ("uploaded".equals(existingAsset.getState()) && Long.valueOf(asset.length()).equals(existingAsset.getSize())) {
                getLog().info("Skipping upload of " + description + " asset because it was already uploaded completely");
                return;
            }
            getLog().info("Deleting incompletely uploaded " + description + " asset of a previous run");
            deleteAsset(existingAsset);
        }
        uploads.add(() -> {
            uploadAsset(release, uploadUrl, description, asset, mediaType);
            return null;
        });
    }

    /**
     * GitHub only ever advertises a receive window of about 76 KB, which limits a single upload to a couple of MB/s
     * however much bandwidth is available. The assets are therefore uploaded over separate connections at the same
     * time, which takes about as long as the slowest one instead of as long as all of them together.
     */
    private void runUploads(List<Callable<Void>> uploads) throws MojoExecutionException {
        if (uploads.isEmpty()) {
            return;
        }
        if (uploads.size() == 1) {
            try {
                uploads.get(0).call();
            } catch (Exception e) {
                throw asMojoExecutionException(e);
            }
            return;
        }
        ExecutorService executor = Executors.newFixedThreadPool(uploads.size());
        try {
            List<Future<Void>> futures = new ArrayList<>();
            for (Callable<Void> upload : uploads) {
                futures.add(executor.submit(upload));
            }
            MojoExecutionException firstError = null;
            for (Future<Void> future : futures) {
                try {
                    future.get();
                } catch (ExecutionException e) {
                    if (firstError == null) {
                        firstError = asMojoExecutionException(e.getCause());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new MojoExecutionException("Interrupted while uploading the assets");
                }
            }
            if (firstError != null) {
                throw firstError;
            }
        } finally {
            executor.shutdownNow();
        }
    }

    private MojoExecutionException asMojoExecutionException(Throwable t) {
        if (t instanceof MojoExecutionException) {
            return (MojoExecutionException) t;
        }
        return new MojoExecutionException("Error while uploading the assets: " + t.getMessage());
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

    private void uploadAsset(org.nzbhydra.github.mavenreleaseplugin.Release release, String uploadUrl, String description, File asset, String mediaType) throws MojoExecutionException {
        String name = asset.getName();
        for (int attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
            getLog().info("Uploading " + description + " asset to " + uploadUrl + (attempt > 1 ? " (attempt " + attempt + " of " + MAX_UPLOAD_ATTEMPTS + ")" : ""));
            Builder callBuilder = new Builder().url(uploadUrl + "?name=" + name);
            callBuilder.header("Authorization", "token " + githubToken);
            callBuilder.post(new ProgressLoggingRequestBody(asset, MediaType.parse(mediaType), description));
            String error;
            try (Response response = client.newCall(callBuilder.build()).execute()) {
                if (response.isSuccessful()) {
                    getLog().info("Successfully uploaded " + description + " asset");
                    return;
                }
                error = "Github returned code " + response.code() + " and message: " + response.message() + readBodyForLogging(response);
                if (response.code() < 500) {
                    throw new MojoExecutionException("When trying to upload " + description + " asset " + error);
                }
            } catch (SlowUploadException e) {
                getLog().info("Upload of " + description + " asset " + e.getMessage()
                              + ", uploading it from the remote upload host instead");
                uploadAssetFromRemoteHost(release, uploadUrl, description, asset, mediaType);
                return;
            } catch (IOException e) {
                error = "the following error occurred: " + e.getMessage();
                getLog().error("Error while uploading " + description + " asset", e);
            }
            if (attempt == MAX_UPLOAD_ATTEMPTS) {
                throw new MojoExecutionException("When trying to upload " + description + " asset " + error);
            }
            getLog().warn("Upload of " + description + " asset failed, " + error + ". Retrying in " + (retryDelayMs / 1000) + " seconds");
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

    /**
     * GitHub explains in the response body why it rejected an upload, so that belongs in the log.
     */
    private String readBodyForLogging(Response response) {
        if (response.body() == null) {
            return "";
        }
        try {
            String body = response.body().string().trim();
            if (body.isEmpty()) {
                return "";
            }
            if (body.startsWith("<")) {
                //An HTML error page from GitHub's proxy, e.g. when it timed out. Its content says nothing worth logging
                return " (GitHub answered with an HTML error page, so the request did not reach the API)";
            }
            return " and body: " + (body.length() > 1000 ? body.substring(0, 1000) + "..." : body);
        } catch (IOException e) {
            return "";
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


    /**
     * Thrown to abort an upload that is too slow to finish before GitHub's proxy times out.
     */
    private static class SlowUploadException extends IOException {
        private SlowUploadException(double megaBytesPerSecond) {
            super(String.format("is only running at %.2f MB/s, which is too slow to finish before GitHub times out", megaBytesPerSecond));
        }
    }

    /**
     * The first seconds of an upload are always fast because the local buffers are filled, so only judge the speed
     * once the grace period has passed.
     */
    protected boolean isTooSlow(long written, long elapsedMs) {
        if (elapsedMs <= GRACE_PERIOD_MS) {
            return false;
        }
        return (written / 1024d / 1024d) / (elapsedMs / 1000d) < slowUploadThresholdMbPerSecond;
    }

    protected boolean remoteUploadEnabled() {
        return useRemoteUpload && remoteUploadHost() != null;
    }

    private String remoteUploadHost() {
        return remoteUploadSettings().get("REMOTE_HOST");
    }

    /**
     * The connection details of the upload host, read from the env file of the arm64 build VM.
     */
    protected Map<String, String> remoteUploadSettings() {
        if (remoteUploadEnv != null) {
            return remoteUploadEnv;
        }
        remoteUploadEnv = new HashMap<>();
        if (remoteUploadEnvFile == null || !remoteUploadEnvFile.exists()) {
            return remoteUploadEnv;
        }
        try {
            for (String line : Files.readAllLines(remoteUploadEnvFile.toPath())) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                    continue;
                }
                String key = trimmed.substring(0, trimmed.indexOf('=')).trim();
                String value = trimmed.substring(trimmed.indexOf('=') + 1).trim().replaceAll("^[\"']|[\"']$", "");
                remoteUploadEnv.put(key, value);
            }
        } catch (IOException e) {
            getLog().warn("Unable to read " + remoteUploadEnvFile + ": " + e.getMessage());
            return remoteUploadEnv;
        }
        if (remoteUploadEnv.containsKey("REMOTE_KEY")) {
            remoteUploadEnv.put("REMOTE_KEY", remoteUploadEnv.get("REMOTE_KEY").replaceFirst("^~", System.getProperty("user.home")));
        }
        remoteUploadEnv.putIfAbsent("REMOTE_USER", "build");
        return remoteUploadEnv;
    }

    /**
     * Copies the asset to the remote host and uploads it to GitHub from there. The token is passed through stdin so
     * that it neither reaches the remote disk nor its process list.
     */
    private void uploadAssetFromRemoteHost(org.nzbhydra.github.mavenreleaseplugin.Release release, String uploadUrl, String description, File asset, String mediaType) throws MojoExecutionException {
        Map<String, String> settings = remoteUploadSettings();
        String target = settings.get("REMOTE_USER") + "@" + settings.get("REMOTE_HOST");
        String key = settings.get("REMOTE_KEY");
        String remoteFile = "/tmp/" + asset.getName();

        getLog().info("Copying " + description + " asset to the remote upload host");
        getLog().debug("Copying to " + target + ":" + remoteFile);
        runRemoteCommand(null, "scp", "-q", "-o", "LogLevel=ERROR", "-i", key, asset.getAbsolutePath(), target + ":" + remoteFile);

        //--config - takes the authorization header from stdin. Passing it as an argument instead would show the
        //token in the remote host's process list.
        String curl = "curl --config - -sS -o /dev/null -w '%{http_code}' -X POST"
                      + " -H \"Content-Type: " + mediaType + "\""
                      + " --data-binary @" + remoteFile
                      + " '" + uploadUrl + "?name=" + asset.getName() + "'";
        String curlConfig = "header = \"Authorization: token " + githubToken.trim() + "\"";

        try {
            String statusCode = null;
            for (int attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
                //GitHub records an asset as soon as an upload starts, so the aborted one left one in state "starter"
                //behind. That record only appears once the aborted request has ended, which can be after the copying,
                //and uploading a second asset of the same name fails with a 500, so delete it before every attempt.
                deleteAssetByName(release, asset.getName());

                getLog().info("Uploading " + description + " asset to GitHub from the remote upload host"
                              + (attempt > 1 ? " (attempt " + attempt + " of " + MAX_UPLOAD_ATTEMPTS + ")" : ""));
                statusCode = runRemoteCommand(curlConfig, "ssh", "-o", "LogLevel=ERROR", "-i", key, target, curl).trim();
                if (statusCode.endsWith("201")) {
                    getLog().info("Successfully uploaded " + description + " asset from the remote upload host");
                    return;
                }
                if (attempt < MAX_UPLOAD_ATTEMPTS) {
                    getLog().warn("Upload of " + description + " asset from the remote upload host failed, GitHub returned code "
                                  + statusCode + ". Retrying in " + (retryDelayMs / 1000) + " seconds");
                    Thread.sleep(retryDelayMs);
                }
            }
            throw new MojoExecutionException("When trying to upload " + description + " asset from the remote upload host GitHub returned code " + statusCode);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MojoExecutionException("Interrupted while uploading the " + description + " asset from the remote upload host");
        } finally {
            runRemoteCommand(null, "ssh", "-o", "LogLevel=ERROR", "-i", key, target, "rm -f " + remoteFile);
        }
    }

    private String runRemoteCommand(String stdin, String... command) throws MojoExecutionException {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();
            if (stdin != null) {
                process.getOutputStream().write((stdin.trim() + "\n").getBytes(StandardCharsets.UTF_8));
            }
            process.getOutputStream().close();
            String output = new String(readAll(process.getInputStream()), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new MojoExecutionException(command[0] + " failed with exit code " + exitCode + ": " + output.trim());
            }
            return output;
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to run " + command[0] + ": " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new MojoExecutionException("Interrupted while running " + command[0]);
        }
    }

    private byte[] readAll(InputStream inputStream) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, read);
        }
        return outputStream.toByteArray();
    }

    /**
     * Writes the asset to the request and logs how much of it has been sent, so that a slow or stalled upload can be
     * told apart from one that is simply taking its time.
     */
    private class ProgressLoggingRequestBody extends RequestBody {

        private static final int CHUNK_SIZE = 64 * 1024;
        private static final long LOG_INTERVAL_MS = 2_000;

        private final File file;
        private final MediaType mediaType;
        private final String description;

        private ProgressLoggingRequestBody(File file, MediaType mediaType, String description) {
            this.file = file;
            this.mediaType = mediaType;
            this.description = description;
        }

        @Override
        public MediaType contentType() {
            return mediaType;
        }

        @Override
        public long contentLength() {
            return file.length();
        }

        @Override
        public void writeTo(BufferedSink sink) throws IOException {
            long length = contentLength();
            long startedAt = System.currentTimeMillis();
            long lastLoggedAt = startedAt;
            long lastLoggedBytes = 0;
            long written = 0;
            Buffer buffer = new Buffer();
            try (Source source = Okio.source(file)) {
                long read;
                while ((read = source.read(buffer, CHUNK_SIZE)) != -1) {
                    sink.write(buffer, read);
                    written += read;
                    long now = System.currentTimeMillis();
                    if (now - lastLoggedAt >= LOG_INTERVAL_MS && written < length) {
                        logProgress(written, length, now - startedAt, written - lastLoggedBytes, now - lastLoggedAt);
                        lastLoggedAt = now;
                        lastLoggedBytes = written;
                        if (remoteUploadEnabled() && isTooSlow(written, now - startedAt)) {
                            throw new SlowUploadException(megaBytesPerSecond(written, now - startedAt));
                        }
                    }
                }
            }
            sink.flush();
            long now = System.currentTimeMillis();
            logProgress(written, length, now - startedAt, written - lastLoggedBytes, now - lastLoggedAt);
            //GitHub only answers once it has processed the whole asset, which takes a while and looks like a stalled upload
            getLog().info("Sent the " + description + " asset completely, waiting for GitHub to process it");
        }

        private void logProgress(long written, long length, long elapsedMs, long bytesSinceLastLog, long msSinceLastLog) {
            long percentage = length == 0 ? 100 : written * 100 / length;
            //The current speed is what the line actually does right now, the average is dominated by the fast start
            //while the local socket buffers were being filled
            double currentMegaBytesPerSecond = megaBytesPerSecond(bytesSinceLastLog, msSinceLastLog);
            double averageMegaBytesPerSecond = megaBytesPerSecond(written, elapsedMs);
            String remaining = "";
            if (currentMegaBytesPerSecond > 0 && written < length) {
                long secondsLeft = (long) ((length - written) / 1024d / 1024d / currentMegaBytesPerSecond);
                remaining = ", " + secondsLeft / 60 + "m " + secondsLeft % 60 + "s left";
            }
            getLog().info(String.format("Sent %d of %d MB of the %s asset (%d%%) at %.2f MB/s, %.2f MB/s on average%s",
                written / 1024 / 1024, length / 1024 / 1024, description, percentage, currentMegaBytesPerSecond, averageMegaBytesPerSecond, remaining));
        }

        private double megaBytesPerSecond(long bytes, long milliseconds) {
            return milliseconds == 0 ? 0 : (bytes / 1024d / 1024d) / (milliseconds / 1000d);
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
