package org.nzbhydra.update;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Charsets;
import com.google.common.base.Supplier;
import com.google.common.base.Suppliers;
import com.google.common.io.Resources;
import com.google.common.net.UrlEscapers;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.JavaVersion;
import org.apache.commons.lang3.SystemUtils;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.mapping.github.Asset;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.notifications.UpdateNotificationEvent;
import org.nzbhydra.systemcontrol.SystemControl;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class UpdateManager implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(UpdateManager.class);

    public static final String KEY = "UpdateData";
    public static final int CACHE_DURATION_MINUTES = 5;
    private static final Pattern GITHUB_ISSUE_PATTERN = Pattern.compile("#(\\d{3,})");
    private static final String DISABLE_UPDATE_PROPERTY = "NZBHYDRA_DISABLE_UPDATE";

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
    protected WebAccess webAccess;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;
    @Autowired
    private SystemControl systemControl;

    @Value("${build.version:0.0.1}")
    protected String currentVersionString;


    protected SemanticVersion currentVersion;
    protected SemanticVersion latestVersion;

    private PackageInfo packageInfo;

    private final ObjectMapper objectMapper;
    protected Supplier<List<Release>> releasesCache = Suppliers.memoizeWithExpiration(getReleasesSupplier(), CACHE_DURATION_MINUTES, TimeUnit.MINUTES);
    protected TypeReference<List<ChangelogVersionEntry>> changelogEntryListTypeReference = new TypeReference<List<ChangelogVersionEntry>>() {
    };

    public UpdateManager() {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    private void loadPackageInfo() {
        File packageFile = new File("/app/nzbhydra2/package_info");
        if (packageFile.exists()) {
            loadPackageInfoFile(packageFile);
        }
        packageFile = new File("package_info");
        if (packageFile.exists()) {
            loadPackageInfoFile(packageFile);
        }
        packageFile = new File("../package_info");
        if (packageFile.exists()) {
            loadPackageInfoFile(packageFile);
        }
    }

    private void loadPackageInfoFile(File lsioPackageFile) {
        Properties properties = new Properties();
        try {
            properties.load(new FileReader(lsioPackageFile));
            packageInfo = new PackageInfo(properties.getProperty("ReleaseType"), properties.getProperty("PackageVersion"), properties.getProperty("PackageAuthor"));
        } catch (IOException e) {
            logger.error("Unable to read package info", e);
        }
    }

    private SemanticVersion getLatestVersion(boolean includePrerelease) throws UpdateException {
        Release latestRelease = getLatestRelease(includePrerelease);
        latestVersion = new SemanticVersion(latestRelease.getTagName());
        return latestVersion;
    }

    public UpdateInfo getUpdateInfo() throws UpdateException {
        UpdateInfo updateInfo = new UpdateInfo();
        updateInfo.setCurrentVersion(currentVersionString);

        final boolean updateToPrereleases = configProvider.getBaseConfig().getMain().isUpdateToPrereleases();
        final Release latestRelease = getLatestRelease(updateToPrereleases);
        final SemanticVersion latestVersion = new SemanticVersion(latestRelease.getTagName());
        updateInfo.setLatestVersion(latestVersion.getAsString());
        updateInfo.setLatestVersionIsBeta(latestRelease.getPrerelease());
        final boolean latestVersionIgnored = isVersionIgnored(latestVersion);
        final boolean latestIsUpdateAndViable = latestVersion.isUpdateFor(currentVersion)
                && !latestVersionIgnored
                && isVersionNotBlocked(latestVersion);

        updateInfo.setUpdateAvailable(latestIsUpdateAndViable);

        updateInfo.setLatestVersionIgnored(latestVersionIgnored);
        updateInfo.setBetaVersionsEnabled(updateToPrereleases);


        if (!updateToPrereleases) {
            final SemanticVersion latestVersionWithBeta = new SemanticVersion(getLatestRelease(true).getTagName());
            if (latestVersionWithBeta.isUpdateFor(latestVersion)) {
                updateInfo.setBetaVersion(latestVersion.getAsString());

                final boolean latestWithBetaIsUpdateAndViable = !isVersionIgnored(latestVersionWithBeta) && isVersionNotBlocked(latestVersionWithBeta);

                //Only true when update to beta is not enabled but there's a new beta version. The user can then choose to install it anyway.
                updateInfo.setBetaUpdateAvailable(latestWithBetaIsUpdateAndViable);
                updateInfo.setBetaVersion(latestVersionWithBeta.getAsString());
            }
        }
        if (currentVersion.major == 4 && latestVersion.major == 5 && !DebugInfosProvider.isRunInDocker() && !genericStorage.get("MANUAL_UPDATE_5x", Boolean.class).orElse(false)) {
            logger.info("An automatic update from 4.x to 5.x is not possible. Please make the update as explained here: https://github.com/theotherp/nzbhydra2/wiki/Updating-from-4.x-to-5.x");
            updateInfo.setUpdateAvailable(false);
            updateInfo.setBetaUpdateAvailable(false);
            genericStorage.save("MANUAL_UPDATE_5x", true);
        } else {
            genericStorage.save("MANUAL_UPDATE_5x", false);
        }
        updateInfo.setPackageInfo(getPackageInfo());

        return updateInfo;
    }

    public boolean isUpdateAvailable() {
        try {
            return getUpdateInfo().isUpdateAvailable();
        } catch (UpdateException e) {
            logger.error("Error while checking if new version is available", e);
            return false;
        }
    }

    public boolean isUpdatedExternally() {
        return DebugInfosProvider.isRunInDocker() || Boolean.parseBoolean(System.getProperty(DISABLE_UPDATE_PROPERTY)) || Boolean.parseBoolean(System.getenv(DISABLE_UPDATE_PROPERTY));
    }

    private boolean isVersionIgnored(SemanticVersion version) throws UpdateException {
        Optional<UpdateData> updateData = genericStorage.get(KEY, UpdateData.class);
        if (updateData.isPresent() && updateData.get().getIgnoreVersions().contains(version)) {
            logger.debug("Version {} is in the list of ignored updates", version);
            return true;
        }
        return false;
    }

    private boolean isVersionNotBlocked(SemanticVersion version) throws UpdateException {
        if (getBlockedVersions().stream().anyMatch(x -> new SemanticVersion(x.getVersion()).equals(version))) {
            logger.debug("Version {} is in the list of blocked updates", version);
            return false;
        }
        return true;
    }

    protected Supplier<List<Release>> getReleasesSupplier() {
        return () -> {
            try {
                return getReleases();
            } catch (UpdateException e) {
                throw new RuntimeException(e);
            }
        };
    }


    public String getCurrentVersionString() {
        return currentVersionString;
    }


    public void ignore(String version) {
        SemanticVersion semanticVersion = new SemanticVersion(version);
        UpdateData updateData = genericStorage.get(KEY, UpdateData.class).orElse(new UpdateData());
        if (!updateData.getIgnoreVersions().contains(semanticVersion)) {
            updateData.getIgnoreVersions().add(semanticVersion);
        }
        genericStorage.save(KEY, updateData);
        logger.info("Version {} ignored. Will not show update notices for this version.", semanticVersion);
    }


    public List<ChangelogVersionEntry> getChangesBetweenCurrentVersionAnd(SemanticVersion upToVersion) throws UpdateException {
        List<ChangelogVersionEntry> allChanges;
        try {
            String response = webAccess.callUrl(changelogUrl);
            allChanges = objectMapper.readValue(response, new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog: " + e.getMessage());
        }

        List<ChangelogVersionEntry> collectedVersionChanges = allChanges.stream().filter(x -> {
                    final SemanticVersion changeVersion = new SemanticVersion(x.getVersion());

                    return upToVersion.isSameOrNewer(changeVersion) && changeVersion.isUpdateFor(currentVersion);
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
        changelogVersionEntries.forEach(x -> x.getChanges().forEach(y -> y.setText(getGithubLinkedText(y))));

        Collections.sort(changelogVersionEntries);
        Collections.reverse(changelogVersionEntries);
        return changelogVersionEntries;
    }

    private String getGithubLinkedText(org.nzbhydra.mapping.changelog.ChangelogChangeEntry entry) {
        final Matcher matcher = GITHUB_ISSUE_PATTERN.matcher(entry.getText());
        if (matcher.find()) {
            String link = "https://github.com/theotherp/nzbhydra2/issues/" + matcher.group(1);
            if (configProvider.getBaseConfig().getMain().getDereferer().isPresent()) {
                link = configProvider.getBaseConfig().getMain().getDereferer().get()
                        .replace("$s", UrlEscapers.urlFragmentEscaper().escape(link)
                                .replace("$us", link));
            }
            return entry.getText().replace(matcher.group(), "<a href=\"" + link + "\" target=\"_blank\">" + matcher.group() + "</a>");

        }
        return entry.getText();
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


    public void installUpdate(String version, boolean isAutomaticUpdate) throws UpdateException {
        final Optional<Release> optionalRelease = releasesCache.get().stream()
                .sorted(Comparator.comparing(x -> new SemanticVersion(((Release) x).getTagName())).reversed())
                .filter(x -> new SemanticVersion(x.getTagName()).isSame(new SemanticVersion((version))))
                .findFirst();

        Release release = optionalRelease.orElseThrow(() -> new UpdateException("Unable to find release with version " + version));
        logger.info("Starting process to update to {}", release.getTagName());
        Asset asset = getAsset(release);
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

        if (release.getTagName().equals("v2.7.6")) {
            applicationEventPublisher.publishEvent(new UpdateEvent(UpdateEvent.State.MIGRATION_NEEDED, "NZBHydra's restart after the update will take longer than usual because the database needs to be migrated."));
        }

        if (isAutomaticUpdate) {
            genericStorage.save("automaticUpdateToNotice", getCurrentVersionString());
        }

        logger.info("Shutting down to let wrapper execute the update");
        applicationEventPublisher.publishEvent(new UpdateEvent(UpdateEvent.State.SHUTDOWN, "Shutting down to let wrapper execute update."));
        if (isAutomaticUpdate) {
            applicationEventPublisher.publishEvent(new UpdateNotificationEvent(release.getName()));
        }
        systemControl.exitWithReturnCode(SystemControl.UPDATE_RETURN_CODE);
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

    private List<Release> getReleases() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases";
            logger.debug("Retrieving latest release from GitHub using URL {}", url);
            List<Release> releases = webAccess.callUrl(url, new TypeReference<List<Release>>() {
            });
            return releases;
        } catch (IOException e) {
            throw new UpdateException("Error while getting latest version: " + e.getMessage());
        }
    }

    private Release getLatestRelease(boolean includePrereleases) {
        return releasesCache.get().stream()
                .sorted(Comparator.comparing(x -> new SemanticVersion(((Release) x).getTagName())).reversed())
                .filter(release -> {
                    if (includePrereleases) {
                        return true;
                    }
                    return release.getPrerelease() == null || !release.getPrerelease();
                }).findFirst().orElse(null);
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


    public void resetCache() {
        releasesCache = Suppliers.memoizeWithExpiration(getReleasesSupplier(), CACHE_DURATION_MINUTES, TimeUnit.MINUTES);
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        if (Objects.equals(currentVersionString, "@project.version@")) {
            currentVersionString = "1.0.0";
            logger.warn("Version string not found. Using 1.0.0");
        }
        currentVersion = new SemanticVersion(currentVersionString);

        loadPackageInfo();
    }

    public PackageInfo getPackageInfo() {
        return packageInfo;
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

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PackageInfo {
        private String releaseType;
        private String version;
        private String author;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UpdateInfo {
        private String currentVersion;
        private String latestVersion;
        private boolean latestVersionIsBeta;
        private boolean updateAvailable;
        private String betaVersion;
        private boolean betaUpdateAvailable;
        private boolean latestVersionIgnored;
        private boolean betaVersionsEnabled;
        private PackageInfo packageInfo;
    }


}
