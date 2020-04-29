package org.nzbhydra.update;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Charsets;
import com.google.common.base.Supplier;
import com.google.common.base.Suppliers;
import com.google.common.io.Resources;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.WindowsTrayIcon;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.mapping.github.Asset;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
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
    private ConfigurableEnvironment environment;
    @Autowired
    private BackupAndRestore backupAndRestore;
    @Autowired
    private GenericStorage updateDataGenericStorage;
    @Autowired
    protected WebAccess webAccess;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    @Value("${build.version:0.0.1}")
    protected String currentVersionString;
    protected SemanticVersion currentVersion;
    protected SemanticVersion latestVersion;

    private ObjectMapper objectMapper;
    protected Supplier<Release> latestReleaseCache = Suppliers.memoizeWithExpiration(getLatestReleaseSupplier(), 15, TimeUnit.MINUTES);
    protected TypeReference<List<ChangelogVersionEntry>> changelogEntryListTypeReference = new TypeReference<List<ChangelogVersionEntry>>() {
    };

    public UpdateManager() {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    private SemanticVersion getLatestVersion() throws UpdateException {
        Release latestRelease = latestReleaseCache.get();
        latestVersion = new SemanticVersion(latestRelease.getTagName());
        return latestVersion;
    }

    public boolean isUpdateAvailable() {
        try {
            return getLatestVersion().isUpdateFor(currentVersion) && !latestVersionIgnored() && !latestVersionBlocked() && latestVersionFinalOrPreEnabled();
        } catch (UpdateException e) {
            logger.error("Error while checking if new version is available", e);
            return false;
        }
    }

    public boolean latestVersionFinalOrPreEnabled() {
        if (configProvider.getBaseConfig().getMain().isUpdateToPrereleases()) {
            return true;
        }
        return latestReleaseCache.get().getPrerelease() == null || !latestReleaseCache.get().getPrerelease();
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
        if (getBlockedVersions().stream().anyMatch(x -> new SemanticVersion(x.getVersion()).equals(latestVersion))) {
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


    public void ignore(String version) {
        SemanticVersion semanticVersion = new SemanticVersion(version);
        UpdateData updateData = updateDataGenericStorage.get(KEY, UpdateData.class).orElse(new UpdateData());
        if (!updateData.getIgnoreVersions().contains(semanticVersion)) {
            updateData.getIgnoreVersions().add(semanticVersion);
        }
        updateDataGenericStorage.save(KEY, updateData);
        logger.info("Version {} ignored. Will not show update notices for this version.", semanticVersion);
    }


    public List<ChangelogVersionEntry> getChangesSinceCurrentVersion() throws UpdateException {
        if (latestVersion == null) {
            getLatestVersion();
        }
        List<ChangelogVersionEntry> allChanges;
        try {
            String response = webAccess.callUrl(changelogUrl);
            allChanges = objectMapper.readValue(response, new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog: " + e.getMessage());
        }

           /*
        3.0.1: Beta release
        3.0.0: Final release
        2.0.1: Beta release
        2.0.0: Final release
        */

        //Current release: 3.0.0, install prereleases: Show changes for 3.0.1
        //Current release 2.0.0, install prerelases: Show changes 2.0.1 and newer
        //Current release 2.0.0, dont install prereleases: Show changes 2.0.1 and 3.0.0

        final Optional<ChangelogVersionEntry> newestFinalUpdate = allChanges.stream().filter(x -> x.isFinal() && new SemanticVersion(x.getVersion()).isUpdateFor(currentVersion)).sorted(Comparator.reverseOrder()).findFirst();

        List<ChangelogVersionEntry> collectedVersionChanges = allChanges.stream().filter(x -> {
                    if (!new SemanticVersion(x.getVersion()).isUpdateFor(currentVersion)) {
                        return false;
                    }
                    if (x.isFinal()) {
                        return true;
                    } else {
                        if (configProvider.getBaseConfig().getMain().isUpdateToPrereleases()) {
                            return true;
                        } else {
                            return newestFinalUpdate.isPresent() && newestFinalUpdate.get().getSemanticVersion().isUpdateFor(x.getSemanticVersion());
                        }
                    }
                }

        ).sorted(Comparator.reverseOrder()).collect(Collectors.toList());

        return collectedVersionChanges.stream()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all the changes from the changelog that came with the currently running version (from first version to the current).
     */
    public List<ChangelogVersionEntry> getAllVersionChangesUpToCurrentVersion() throws UpdateException {
        List<ChangelogVersionEntry> changelogVersionEntries;
        try {
            String changelogJsonString = Resources.toString(Resources.getResource(UpdateManager.class, "/changelog.json"), Charsets.UTF_8);
            changelogVersionEntries = objectMapper.readValue(changelogJsonString, changelogEntryListTypeReference);
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog: " + e.getMessage());
        }

        Collections.sort(changelogVersionEntries);
        Collections.reverse(changelogVersionEntries);
        return changelogVersionEntries;
    }


    /**
     * Retrieves the changes made by the installation of an automatic update.
     */
    public List<ChangelogVersionEntry> getAutomaticUpdateVersionHistory() throws UpdateException {
        Optional<String> previousVersion = genericStorage.get(AutomaticUpdater.TO_NOTICE_KEY, String.class);
        if (!previousVersion.isPresent()) {
            logger.error("Unable to find the version from which the automatic update was installed");
            return Collections.emptyList();
        }

        List<ChangelogVersionEntry> changelogVersionEntries;
        try {
            String changelogJsonString = Resources.toString(Resources.getResource(UpdateManager.class, "/changelog.json"), Charsets.UTF_8);
            changelogVersionEntries = objectMapper.readValue(changelogJsonString, changelogEntryListTypeReference);
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog: " + e.getMessage());
        }

        Collections.sort(changelogVersionEntries);
        Collections.reverse(changelogVersionEntries);

        SemanticVersion previousSemanticVersion = new SemanticVersion(previousVersion.get());
        return changelogVersionEntries.stream()
                .filter(x -> x.getSemanticVersion().isUpdateFor(previousSemanticVersion))
                .collect(Collectors.toList());
    }


    public void installUpdate(boolean isAutomaticUpdate) throws UpdateException {
        Release latestRelease = latestReleaseCache.get();
        logger.info("Starting process to update to {}", latestRelease.getTagName());
        Asset asset = getAsset(latestRelease);
        String url = asset.getBrowserDownloadUrl();
        logger.debug("Downloading update from URL {}", url);

        File updateZip;
        try {

            File updateFolder = new File(NzbHydra.getDataFolder(), "update");
            if (!updateFolder.exists()) {
                logger.debug("Creating update folder {}", updateFolder);
                Files.createDirectory(updateFolder.toPath());
            } else {
                logger.debug("Cleaning update folder {}", updateFolder.getAbsolutePath());
                FileUtils.cleanDirectory(updateFolder);
            }

            updateZip = new File(updateFolder, asset.getName());
            logger.debug("Saving update file as {}", updateZip.getAbsolutePath());
            applicationEventPublisher.publishEvent(new UpdateEvent(UpdateEvent.State.DOWNLOADING, "Downloading update file."));
            webAccess.downloadToFile(url, updateZip);
        } catch (RestClientException | IOException e) {
            logger.error("Error while download or saving ZIP", e);
            throw new UpdateException("Error while downloading, saving or extracting update ZIP", e);
        }

        final BaseConfig baseConfig = configProvider.getBaseConfig();
        if (baseConfig.getMain().isBackupBeforeUpdate()) {
            try {
                logger.info("Creating backup before shutting down");
                applicationEventPublisher.publishEvent(new UpdateEvent(UpdateEvent.State.CREATING_BACKUP, "Creating backup before update."));
                backupAndRestore.backup();
            } catch (Exception e) {
                throw new UpdateException("Unable to create backup before update", e);
            }
        }

        if (latestRelease.getTagName().equals("v2.7.6")) {
            applicationEventPublisher.publishEvent(new UpdateEvent(UpdateEvent.State.MIGRATION_NEEDED, "NZBHydra's restart after the update will take longer than usual because the database needs to be migrated."));
        }

        if (isAutomaticUpdate) {
            genericStorage.save("automaticUpdateToNotice", getCurrentVersionString());
        }

        logger.info("Shutting down to let wrapper execute the update");
        applicationEventPublisher.publishEvent(new UpdateEvent(UpdateEvent.State.SHUTDOWN, "Shutting down to let wrapper execute update."));
        exitWithReturnCode(UPDATE_RETURN_CODE);
    }

    protected Asset getAsset(Release latestRelease) throws UpdateException {
        List<Asset> assets = latestRelease.getAssets();
        if (assets.isEmpty()) {
            throw new UpdateException("No assets found for release " + latestRelease.getTagName());
        }
        String osName = System.getProperty("os.name");
        boolean isOsWindows = osName.toLowerCase().contains("windows");
        String assetToContain = isOsWindows ? "windows" : "linux"; //LATER What about OSX?
        Optional<Asset> optionalAsset = assets.stream().filter(x -> x.getName().toLowerCase().contains(assetToContain)).findFirst();
        if (!optionalAsset.isPresent()) {
            logger.error("Unable to find asset for platform {} in these assets: {}", assetToContain, assets.stream().map(Asset::getName).collect(Collectors.joining(", ")));
            throw new UpdateException("Unable to find asset for current platform " + assetToContain);
        }

        return optionalAsset.get();
    }

    private Release getLatestRelease() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases";
            logger.debug("Retrieving latest release from GitHub using URL {}", url);
            List<Release> releases = webAccess.callUrl(url, new TypeReference<List<Release>>() {
            });
            return releases.stream()
                    .sorted(Comparator.comparing(x -> new SemanticVersion(((Release) x).getTagName())).reversed())
                    .filter(release -> {
                        if (configProvider.getBaseConfig().getMain().isUpdateToPrereleases()) {
                            return true;
                        }
                        return release.getPrerelease() == null || !release.getPrerelease();
                    }).findFirst().orElse(null);
        } catch (IOException e) {
            throw new UpdateException("Error while getting latest version: " + e.getMessage());
        }
    }


    protected List<BlockedVersion> getBlockedVersions() throws UpdateException {
        logger.debug("Getting blocked versions from GitHub using URL {}", blockedVersionsUrl);
        List<BlockedVersion> blockedVersions;
        try {
            String response = webAccess.callUrl(blockedVersionsUrl);
            blockedVersions = objectMapper.readValue(response, new TypeReference<List<BlockedVersion>>() {
            });
        } catch (IOException e) {
            throw new UpdateException("Error while getting blocked versions: " + e.getMessage());
        }
        return blockedVersions;
    }


    public void exitWithReturnCode(final int returnCode) {
        if (Boolean.parseBoolean(environment.getProperty("hydradontshutdown", "false"))) {
            logger.warn("Not shutting down because property hydradontshutdown is set");
            return;
        }
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
                applicationEventPublisher.publishEvent(new ShutdownEvent());
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
        if (Objects.equals(currentVersionString, "@project.version@")) {
            currentVersionString = "1.0.0";
            logger.warn("Version string not found. Using 1.0.0");
        }
        currentVersion = new SemanticVersion(currentVersionString);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UpdateEvent {

        enum State {
            DOWNLOADING,
            CREATING_BACKUP,
            MIGRATION_NEEDED,
            SHUTDOWN
        }

        private State state;
        private String message;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BlockedVersion {
        private String version;
        private String comment;
    }
}
