package org.nzbhydra.update;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Joiner;
import com.google.common.base.Supplier;
import com.google.common.base.Suppliers;
import lombok.AllArgsConstructor;
import lombok.Data;
import okhttp3.Request;
import okhttp3.Request.Builder;
import okhttp3.Response;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.Markdown;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.WindowsTrayIcon;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.github.Asset;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class UpdateManager implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(UpdateManager.class);
    public static final int SHUTDOWN_RETURN_CODE = 0;
    public static final int UPDATE_RETURN_CODE = 11;
    public static final int RESTART_RETURN_CODE = 22;
    public static final int RESTORE_RETURN_CODE = 33;
    public static final String KEY = "UpdateData";

    @Value("${nzbhydra.repositoryBaseUrl}")
    protected String repositoryBaseUrl;

    @Value("${nzbhydra.changelogUrl}")
    protected String changelogUrl;

    @Value("${nzbhydra.blockedVersionsUrl}")
    protected String blockedVersionsUrl;

    @Autowired
    protected HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Autowired
    private BackupAndRestore backupAndRestore;
    @Autowired
    private GenericStorage updateDataGenericStorage;

    protected String currentVersionString = "0.0.1"; //TODO FIll with version from pom.properties, see http://stackoverflow.com/questions/3886753/access-maven-project-version-in-spring-config-files
    protected SemanticVersion currentVersion;

    private ObjectMapper objectMapper;
    protected Supplier<Release> latestReleaseCache = Suppliers.memoizeWithExpiration(getLatestReleaseSupplier(), 15, TimeUnit.MINUTES);

    public UpdateManager() {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);
    }

    private SemanticVersion getLatestVersion() throws UpdateException {
        Release latestRelease = latestReleaseCache.get();
        return new SemanticVersion(latestRelease.getTagName());
    }

    public boolean isUpdateAvailable() {
        try {
            return getLatestVersion().isUpdateFor(currentVersion) && !latestVersionIgnored() && !latestVersionBlocked();
        } catch (UpdateException e) {
            logger.error("Error while checking if new version is available", e);
            return false;
        }
    }

    public boolean latestVersionIgnored() throws UpdateException {
        SemanticVersion latestVersion = getLatestVersion();
        Optional<UpdateData> updateData = updateDataGenericStorage.get(KEY, UpdateData.class);
        if (updateData.isPresent() && updateData.get().getIgnoreVersions().contains(latestVersion)) {
            logger.debug("Version {} is in the list of ignored updates", latestVersion);
            return true;
        }
        return false;
    }

    public boolean latestVersionBlocked() throws UpdateException {
        SemanticVersion latestVersion = getLatestVersion();
        if (getBlockedVersions().stream().anyMatch(x -> x.getVersion().equals(latestVersion))) {
            logger.debug("Version {} is in the list of blocked updates", latestVersion);
            return true;
        }
        return false;
    }

    protected Supplier<Release> getLatestReleaseSupplier() {
        return () -> {
            try {
                return getLatestRelease();
            } catch (UpdateException e) {
                throw new RuntimeException(e);
            }
        };
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
            try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    throw new UpdateException("Error while getting changelog from GitHub: " + response.message());
                }
                return response.body().string();
            }
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog from GitHub", e);
        }
    }

    public void ignore(String version) {
        SemanticVersion semanticVersion = new SemanticVersion(version);
        UpdateData updateData = updateDataGenericStorage.get(KEY, UpdateData.class).orElse(new UpdateData());
        updateData.getIgnoreVersions().add(semanticVersion);
        updateDataGenericStorage.save(KEY, updateData);
        logger.info("Version {} ignored. Will not show update notices for this version.", semanticVersion);
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
            String responseBody = executeRequest(url);

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

    protected String executeRequest(String url) throws IOException {
        Request request = new Builder().url(url).build();
        try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
            return response.body().string();
        }
    }


    public void installUpdate() throws UpdateException {
        Release latestRelease = latestReleaseCache.get();
        logger.info("Starting update process to {}", latestRelease.getTagName());
        Asset asset = getAsset(latestRelease);
        String url = asset.getBrowserDownloadUrl();
        logger.debug("Downloading update from URL {}", url);
        Request request = new Builder().url(url).build();

        File updateZip;
        try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {

            File updateFolder = new File(NzbHydra.getDataFolder(), "update");
            if (!updateFolder.exists()) {
                Files.createDirectory(updateFolder.toPath());
            } else {
                FileUtils.cleanDirectory(updateFolder);
            }

            updateZip = new File(updateFolder, asset.getName());
            logger.debug("Saving update file as {}", updateZip.getAbsolutePath());
            Files.copy(response.body().byteStream(), updateZip.toPath());
        } catch (IOException e) {
            throw new UpdateException("Error while downloading, saving or extracting update ZIP", e);
        }


        try {
            logger.info("Creating backup before shutting down");
            backupAndRestore.backup();
        } catch (Exception e) {
            throw new UpdateException("Unable to create backup before update", e);
        }

        logger.info("Shutting down to let wrapper execute the update");
        exitWithReturnCode(UPDATE_RETURN_CODE);
    }

    protected Asset getAsset(Release latestRelease) throws UpdateException {
        List<Asset> assets = latestRelease.getAssets();
        if (assets.isEmpty()) {
            throw new UpdateException("No assets found for release " + latestRelease.getTagName());
        }
        String osName = System.getProperty("os.name");
        boolean isOsWindows = osName.toLowerCase().contains("windows");
        String assetToContain = isOsWindows ? "windows" : "linux"; //TODO What about OSX?
        Optional<Asset> optionalAsset = assets.stream().filter(x -> x.getName().toLowerCase().contains(assetToContain)).findFirst();
        if (!optionalAsset.isPresent()) {
            logger.error("Unable to find asset for platform {} in these assets: {}", assetToContain, assets.stream().map(Asset::getName).collect(Collectors.joining(", ")));
            throw new UpdateException("Unable to find asset for current platform " + assetToContain);
        }

        return optionalAsset.get();
    }


    private Release getLatestRelease() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases/latest";
            logger.debug("Retrieving latest release from GitHub using URL {}", url);
            Request request = new Builder().url(url).build();
            try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
                String responseBody = response.body().string();
                return objectMapper.readValue(responseBody, Release.class);
            }
        } catch (IOException e) {
            throw new UpdateException("Error while getting latest version: " + e.getMessage());
        }
    }


    protected List<BlockedVersion> getBlockedVersions() throws UpdateException {
        Request request = new Request.Builder().url(blockedVersionsUrl).build();
        logger.debug("Getting blocked versions from GitHub");
        try (Response response = requestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
            List<BlockedVersion> blockedVersions = new ObjectMapper().readValue(response.body().string(), new TypeReference<List<BlockedVersion>>() {
            });
            return blockedVersions;
        } catch (IOException e) {
            logger.error("Unable to read blocked versions", e);
            throw new UpdateException("Unable to read blocked versions");
        }
    }


    public void exitWithReturnCode(final int returnCode) {
        new Thread(() -> {
            try {
                Path controlIdFilePath = new File(NzbHydra.getDataFolder(), "control.id").toPath();
                logger.debug("Writing control ID {} to {}", returnCode, controlIdFilePath);
                Files.write(controlIdFilePath, String.valueOf(returnCode).getBytes());
            } catch (IOException e) {
                logger.error("Unable to write control code to file. Wrapper might not behave as expected");
            }
            try {
                //Wait just enough for the request to be completed
                Thread.sleep(300);
                ((ConfigurableApplicationContext) NzbHydra.getApplicationContext()).close();
                WindowsTrayIcon.remove();
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

    @Data
    @AllArgsConstructor
    public static class BlockedVersion {
        private SemanticVersion version;
        private String comment;
    }
}
