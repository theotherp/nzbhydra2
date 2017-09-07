package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request.Builder;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.internal.Util;
import okio.BufferedSink;
import okio.Okio;
import okio.Source;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.nzbhydra.github.mavenreleaseplugin.ReleaseMojo.CountingFileRequestBody.ProgressListener;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;


@SuppressWarnings("unchecked")
@Mojo(name = "release",
        requiresOnline = true, //Obviously
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class ReleaseMojo extends AbstractMojo {

    private OkHttpClient client;

    @Parameter(property = "githubToken", required = true)
    private String githubToken;

    @Parameter(property = "githubReleasesUrl", required = true)
    protected String githubReleasesUrl;

    @Parameter(property = "changelogEntry", required = true)
    private String changelogEntry;

    @Parameter(property = "tagName", required = true)
    private String tagName;

    @Parameter(property = "commitish", required = true)
    private String commitish;

    @Parameter(property = "windowsAsset", required = true)
    protected File windowsAsset;

    @Parameter(property = "linuxAsset", required = true)
    protected File linuxAsset;

    private ObjectMapper objectMapper;


    public void execute() throws MojoExecutionException {
        client = new OkHttpClient();
        objectMapper = new ObjectMapper();

        getLog().info("Will release version " + tagName + " to GitHub");

        if (!windowsAsset.exists()) {
            throw new MojoExecutionException("Windows asset file does not exist: " + windowsAsset.getAbsolutePath());
        }
        getLog().info("Will use windows asset " + windowsAsset.getAbsolutePath());

        if (!linuxAsset.exists()) {
            throw new MojoExecutionException("Linux asset file does not exist: " + linuxAsset.getAbsolutePath());
        }
        getLog().info("Will use linux asset " + linuxAsset.getAbsolutePath());

        try {
            org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest = new org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest();
            releaseRequest.setTagName(tagName);
            releaseRequest.setBody(changelogEntry);
            releaseRequest.setName(tagName);
            releaseRequest.setDraft(true);
            releaseRequest.setPrerelease(false);
            releaseRequest.setTargetCommitish(commitish);


            org.nzbhydra.github.mavenreleaseplugin.Release releaseResponseObject = createRelease(releaseRequest);
            uploadAssets(releaseResponseObject);
            if (releaseResponseObject.getAssets().size() != 2) {
                throw new MojoExecutionException("Expected new release to have 2 assets but it has " + releaseResponseObject.getAssets().size());
            }

            setReleaseEffective(releaseRequest, releaseResponseObject);

        } catch (IOException e) {
            throw new MojoExecutionException("Error releasing", e);
        }
    }

    private org.nzbhydra.github.mavenreleaseplugin.Release createRelease(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest) throws IOException, MojoExecutionException {
        getLog().info("Creating release in draft mode using base URL " + githubReleasesUrl);
        String url = githubReleasesUrl + "?access_token=" + githubToken;
        Call call = client.newCall(new Builder().url(url).post(RequestBody.create(MediaType.parse("application/json"), objectMapper.writeValueAsString(releaseRequest))).build());
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
        getLog().info("Uploading windows asset");

        Response response = client.newCall(new Builder().url(uploadUrl + "?name=" + name)
                .post(
                        new CountingFileRequestBody(windowsAsset, "application/zip", getProgressListener()
                        ))
                .build()).execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to upload windows asset Github returned code " + response.code() + " and message: " + response.message());
        }

        getLog().info("Successfully uploaded windows asset");

        getLog().info("Uploading linux asset");
        name = linuxAsset.getName();
        response = client.newCall(new Builder().url(uploadUrl + "?name=" + name)
                .post(
                        new CountingFileRequestBody(linuxAsset, "application/gzip", getProgressListener()
                        ))
                .build()).execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to upload linux asset Github returned code " + response.code() + " and message: " + response.message());
        }
        getLog().info("Successfully uploaded linux asset");
    }

    private ProgressListener getProgressListener() {
        return new ProgressListener() {
            public Set<Integer> loggedPercentages = new HashSet<>();

            @Override
            public void transferred(long num) {
                Integer percent = (int) ((num / (float) windowsAsset.length()) * 100);
                if (percent % 10 == 0 && percent > 0 && !loggedPercentages.contains(percent)) {
                    getLog().info("Uploaded " + percent + "%");
                    loggedPercentages.add(percent);
                }
            }
        };
    }

    private void setReleaseEffective(org.nzbhydra.github.mavenreleaseplugin.ReleaseRequest releaseRequest, org.nzbhydra.github.mavenreleaseplugin.Release release) throws IOException, MojoExecutionException {
        getLog().info("Setting release effective");
        releaseRequest.setDraft(false);
        Call call = client.newCall(new Builder().url(release.getUrl()).patch(RequestBody.create(MediaType.parse("application/json"), objectMapper.writeValueAsString(releaseRequest))).build());
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

    public static class CountingFileRequestBody extends RequestBody {

        private static final int SEGMENT_SIZE = 2048; // okio.Segment.SIZE

        private final File file;
        private final ProgressListener listener;
        private final String contentType;

        public CountingFileRequestBody(File file, String contentType, ProgressListener listener) {
            this.file = file;
            this.contentType = contentType;
            this.listener = listener;
        }

        @Override
        public long contentLength() {
            return file.length();
        }

        @Override
        public MediaType contentType() {
            return MediaType.parse(contentType);
        }

        @Override
        public void writeTo(BufferedSink sink) throws IOException {
            Source source = null;
            try {
                source = Okio.source(file);
                long total = 0;
                long read;

                while ((read = source.read(sink.buffer(), SEGMENT_SIZE)) != -1) {
                    total += read;
                    sink.flush();
                    this.listener.transferred(total);

                }
            } finally {
                Util.closeQuietly(source);
            }
        }

        public interface ProgressListener {
            void transferred(long num);
        }

    }


}
