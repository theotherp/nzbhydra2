package org.nzbhydra;

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
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.nzbhydra.ReleaseMojo.CountingFileRequestBody.ProgressListener;

import java.io.File;
import java.io.IOException;


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


    public void execute() throws MojoExecutionException {
        client = new OkHttpClient();

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
            JSONObject releaseRequestObject = new JSONObject();
            releaseRequestObject.put("tag_name", tagName);
            releaseRequestObject.put("name", tagName);
            releaseRequestObject.put("target_commitish", commitish);
            releaseRequestObject.put("body", changelogEntry);
            releaseRequestObject.put("draft", true);
            releaseRequestObject.put("prerelease", false);

            JSONObject releaseResponseObject = createRelease(releaseRequestObject);
            uploadAssets(releaseResponseObject);
            //TODO: Verify that the two assets exist when getting the release from github
            setReleaseEffective(releaseRequestObject, releaseResponseObject);

        } catch (IOException e) {
            throw new MojoExecutionException("Error releasing", e);
        }
    }

    private JSONObject createRelease(JSONObject releaseObject) throws IOException, MojoExecutionException {
        getLog().info("Creating release in draft mode using base URL " + githubReleasesUrl);
        Call call = client.newCall(new Builder().url(githubReleasesUrl + "?access_token=" + githubToken).post(RequestBody.create(MediaType.parse("application/json"), releaseObject.toJSONString())).build());
        Response response = call.execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to create release Github returned code " + response.code() + " and message: " + response.message());
        }
        String body = response.body().string();
        try {
            return (JSONObject) new JSONParser().parse(body);
        } catch (ParseException e) {
            throw new MojoExecutionException("Unable to parse GitHub's release response: " + body, e);
        } finally {
            getLog().info("Successfully created release");
        }
    }

    private void uploadAssets(JSONObject release) throws IOException, MojoExecutionException {


        String uploadUrl = (String) release.get("upload_url");
        uploadUrl = uploadUrl.replace("{?name,label}", "");

        String name = windowsAsset.getName();
        getLog().info("Uploading windows asset");
        Response response = client.newCall(new Builder().url(uploadUrl + "?name=" + name).post(
                new CountingFileRequestBody(windowsAsset, "application/zip", new ProgressListener() {
                    @Override
                    public void transferred(long num) {
                        //TODO
//                        if ((windowsAsset.length() / num) % 10 == 0) {
//                            float percent = (num / (float) windowsAsset.length()) * 100;
//                            getLog().info("Uploaded " + percent + "%");
//                        }
                    }
                })
        ).build()).execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to create release Github returned code " + response.code() + " and message: " + response.message());
        }
        getLog().info("Successfully uploade windows asset");

        getLog().info("Uploading linux asset");
        name = linuxAsset.getName();
        response = client.newCall(new Builder().url(uploadUrl + "?name=" + name).post(RequestBody.create(MediaType.parse("application/gzip"), linuxAsset)).build()).execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to create release Github returned code " + response.code() + " and message: " + response.message());
        }
        getLog().info("Successfully uploaded linux windows asset");
    }

    private void setReleaseEffective(JSONObject releaseRequestObject, JSONObject releaseResponseObject) throws IOException, MojoExecutionException {
        getLog().info("Setting release effective");
        releaseRequestObject.put("draft", false);
        Call call = client.newCall(new Builder().url((String) releaseResponseObject.get("url")).patch(RequestBody.create(MediaType.parse("application/json"), releaseRequestObject.toJSONString())).build());
        Response response = call.execute();
        if (!response.isSuccessful()) {
            throw new MojoExecutionException("When trying to set release effective Github returned code " + response.code() + " and message: " + response.message());
        }
        String body = response.body().string();
        try {
            JSONObject effectiveRelease = (JSONObject) new JSONParser().parse(body);
            if ((boolean) effectiveRelease.get("draft")) {
                getLog().error("Release is still in state 'draft'");
            } else {
                getLog().info("Successfully set release effective");
            }
        } catch (ParseException e) {
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
