package org.nzbhydra.update;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Joiner;
import okhttp3.Request;
import okhttp3.Request.Builder;
import okhttp3.Response;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.Markdown;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.mapping.github.Asset;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

@Component
public class UpdateManager implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(UpdateManager.class);
    public static final int SHUTDOWN_RETURN_CODE = 0;
    public static final int UPDATE_RETURN_CODE = 11;
    public static final int RESTART_RETURN_CODE = 22;
    public static final int RESTORE_RETURN_CODE = 33;

    @Value("${nzbhydra.repositoryBaseUrl}")
    protected String repositoryBaseUrl;

    @Value("${nzbhydra.changelogUrl}")
    protected String changelogUrl;

    @Autowired
    protected HydraOkHttp3ClientHttpRequestFactory requestFactory;

    protected String currentVersionString = "0.0.1"; //TODO FIll with version from pom.properties, see http://stackoverflow.com/questions/3886753/access-maven-project-version-in-spring-config-files
    protected SemanticVersion currentVersion;

    protected Instant lastCheckedForNewVersion = Instant.ofEpochMilli(0L);
    private SemanticVersion latestVersion;
    private ObjectMapper objectMapper;
    private Lock lock = new ReentrantLock();

    public UpdateManager() {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);
    }

    public boolean isUpdateAvailable() throws UpdateException {
        return getLatestVersion().isUpdateFor(currentVersion);
    }

    public String getLatestVersionString() throws UpdateException {
        return getLatestVersion().toString();
    }

    public String getCurrentVersionString() {
        return currentVersionString;
    }

    /**
     * Returns the full content of the changelog.md formatted as HTML
     *
     * @return HTML formatted changelog
     * @throws UpdateException Unable to reach GitHub or parse data
     */
    public String getFullChangelog() throws UpdateException {
        Request request = new Builder().url(changelogUrl).build();
        try {
            Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute();
            if (!response.isSuccessful()) {
                throw new UpdateException("Error while getting changelog from GitHub: " + response.message());
            }
            return response.body().string();
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog from GitHub", e);
        }
    }

    /**
     * Returns all changes from releases after the current one as formatted HTML
     *
     * @return HTML with the markdown from the release bodies rendered and separated with <hr>
     * @throws UpdateException Unable to reach github or parse the output
     */
    public String getChangesSince() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases";
            logger.debug("Loading changes since current version {} from GitHub using URL", currentVersion, url);
            Request request = new Builder().url(url).build();
            Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute();
            String responseBody = response.body().string();
            List<Release> releases = objectMapper.readValue(responseBody, new TypeReference<List<Release>>() {
            });
            releases.sort((o1, o2) -> {
                try {
                    //Newest version first
                    return new SemanticVersion(o2.getTagName()).compareTo(new SemanticVersion(o1.getTagName()));
                } catch (RuntimeException e) {
                    logger.error("Error comparing versions {} and {}", o1, o2);
                    return 0;
                }
            });
            List<String> collectedVersionChanges = new ArrayList<>();
            for (Release release : releases) {
                if (new SemanticVersion(release.getTagName()).equals(currentVersion)) {
                    break;
                }
                collectedVersionChanges.add("## " + release.getTagName() + "\r\n" + release.getBody());
            }
            String allChanges = Joiner.on("\r\n***\r\n").join(collectedVersionChanges);

            String html = Markdown.renderMarkdownAsHtml(allChanges);
            return html;
        } catch (IOException | RuntimeException e) {
            throw new UpdateException("Error while getting changelog", e);
        }
    }


    public void installUpdate() throws UpdateException {
        Release latestRelease = getLatestRelease();
        logger.info("Starting update process to {}", latestRelease.getTagName());
        List<Asset> assets = latestRelease.getAssets();
        if (assets.isEmpty()) {
            throw new UpdateException("No assets found for release " + latestRelease.getTagName());
        }
        //TODO Find asset for current OS or whatever
        Asset asset = assets.get(0);
        String url = asset.getBrowserDownloadUrl();
        logger.debug("Downloading update from URL {}", url);
        Request request = new Builder().url(url).build();

        File updateZip;
        try {
            Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute();
            InputStream inputStream = response.body().byteStream();
            File updateFolder = new File(NzbHydra.getDataFolder(), "update");
            if (!updateFolder.exists()) {
                Files.createDirectory(updateFolder.toPath());
            } else {
                FileUtils.cleanDirectory(updateFolder);
            }

            updateZip = new File(updateFolder, asset.getName());
            logger.debug("Saving update file as {}", updateZip.getAbsolutePath());
            Files.copy(inputStream, updateZip.toPath());
        } catch (IOException e) {
            throw new UpdateException("Error while downloading, saving or extracting update ZIP", e);
        }
        logger.info("Shutting down to let wrapper execute the update");
        exitWithReturnCode(UPDATE_RETURN_CODE);
    }

    private SemanticVersion getLatestVersion() throws UpdateException {
        try {
            //Lock calls to this method so multiple concurrent calls don't hammer the server
            lock.lock();
            if (Instant.now().minus(15, ChronoUnit.MINUTES).isAfter(lastCheckedForNewVersion)) {
                Release latestRelease = getLatestRelease();
                latestVersion = new SemanticVersion(latestRelease.getTagName());
                lastCheckedForNewVersion = Instant.now();
            }
            return latestVersion;
        } catch (RuntimeException e) {
            throw new UpdateException("Error while checking for latest version", e);
        } finally {
            lock.unlock();
        }
    }

    private Release getLatestRelease() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases/latest";
            logger.debug("Retrieving latest release from GitHub using URL {}", url);
            Request request = new Builder().url(url).build();
            Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute();
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Release.class);
        } catch (IOException e) {
            throw new UpdateException("Error while getting latest version: " + e.getMessage());
        }
    }


    public void exitWithReturnCode(final int returnCode) {
        new Thread(() -> {
            try {
                //Wait just enough for the request to be completed
                Thread.sleep(300);
                System.exit(returnCode);
            } catch (InterruptedException e) {
                logger.error("Error while waiting to exit", e); //Doesn't ever happen anyway
            }
        }).start();
    }


    @Override
    public void afterPropertiesSet() throws Exception {
        currentVersion = new SemanticVersion(currentVersionString);
    }
}
