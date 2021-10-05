package org.nzbhydra.update;

import com.google.common.base.Supplier;
import com.google.common.base.Suppliers;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.ExceptionInfo;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.problemdetection.OutdatedWrapperDetector;
import org.nzbhydra.update.UpdateManager.UpdateEvent;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
public class UpdatesWeb {

    private static final Logger logger = LoggerFactory.getLogger(UpdatesWeb.class);

    private final List<String> updateMessages = new ArrayList<>();

    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private OutdatedWrapperDetector outdatedWrapperDetector;
    @Autowired
    private GenericStorage genericStorage;

    protected Supplier<VersionsInfo> versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), UpdateManager.CACHE_DURATION_MINUTES, TimeUnit.MINUTES);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/infos", method = RequestMethod.GET)
    public VersionsInfo getVersions() {
        if (Boolean.parseBoolean(environment.getProperty("alwayscheckforupdates", "false"))) {
            updateManager.resetCache();
            versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), UpdateManager.CACHE_DURATION_MINUTES, TimeUnit.MINUTES);
        }
        return versionsInfoCache.get();
    }

    protected Supplier<VersionsInfo> versionsInfoSupplier() {
        return () -> {
            try {
                if (!configProvider.getBaseConfig().getMain().isUpdateCheckEnabled()) {
                    //Just for development
                    return new VersionsInfo();
                }

                final UpdateManager.UpdateInfo updateInfo = updateManager.getUpdateInfo();
                return new VersionsInfo(updateInfo.getCurrentVersion(),
                        updateInfo.getLatestVersion(),
                        updateInfo.isLatestVersionIsBeta(),
                        updateInfo.getBetaVersion(),
                        updateInfo.isUpdateAvailable(),
                        updateInfo.isBetaUpdateAvailable(),
                        updateInfo.isLatestVersionIgnored(),
                        updateInfo.isBetaVersionsEnabled(),
                        DebugInfosProvider.isRunInDocker(),
                        configProvider.getBaseConfig().getMain().isShowUpdateBannerOnDocker(),
                        configProvider.getBaseConfig().getMain().isShowWhatsNewBanner(),
                        outdatedWrapperDetector.isOutdatedWrapperDetected(),
                        genericStorage.get(AutomaticUpdater.TO_NOTICE_KEY, String.class).orElse(null),
                        updateInfo.getPackageInfo());
            } catch (UpdateException e) {
                logger.error("An error occured while getting version information", e);
                throw new RuntimeException("Unable to get update information");
            }
        };
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/simpleInfos", method = RequestMethod.GET)
    public VersionsInfo getSimpleInfos() {
        VersionsInfo versionsInfo = new VersionsInfo();
        versionsInfo.setCurrentVersion(updateManager.getCurrentVersionString());
        versionsInfo.setPackageInfo(updateManager.getPackageInfo());
        return versionsInfo;
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/changesSinceUpTo", method = RequestMethod.GET)
    public List<ChangelogVersionEntry> getChangesSince(@RequestParam String version) throws Exception {
        return updateManager.getChangesBetweenCurrentVersionAnd(new SemanticVersion(version));
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/versionHistory", method = RequestMethod.GET)
    public List<ChangelogVersionEntry> getVersionHistory() throws Exception {
        return updateManager.getAllVersionChangesUpToCurrentVersion();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/automaticUpdateVersionHistory", method = RequestMethod.GET)
    public List<ChangelogVersionEntry> getVersionHistoryForAutomaticUpdate() throws Exception {
        return updateManager.getAutomaticUpdateVersionHistory();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/ackAutomaticUpdateVersionHistory", method = RequestMethod.GET)
    public void ackHistoryForAutomaticUpdateShown() {
        genericStorage.remove(AutomaticUpdater.TO_NOTICE_KEY);
        //Reset cache
        versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), 15, TimeUnit.MINUTES);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/ignore/{version}", method = RequestMethod.PUT, consumes = MediaType.ALL_VALUE)
    public void ignore(@PathVariable String version) {
        updateManager.ignore(version);
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/installUpdate/{version}", method = RequestMethod.PUT)
    public GenericResponse installUpdate(@PathVariable String version) throws Exception {
        updateMessages.clear();
        updateManager.installUpdate(version, false);
        return new GenericResponse(true, null);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/messages", method = RequestMethod.GET)
    public List<String> getUpdateMessages() {
        return updateMessages;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/isDisplayWrapperOutdated", method = RequestMethod.GET)
    public boolean isWrapperOutdated() {
        return outdatedWrapperDetector.isOutdatedWrapperDetected() && outdatedWrapperDetector.isOutdatedWrapperDetectedWarningNotYetShown();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/resetCache", method = RequestMethod.GET)
    public void resetCache() {
        updateManager.resetCache();
        versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), UpdateManager.CACHE_DURATION_MINUTES, TimeUnit.MINUTES);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/setOutdatedWrapperDetectedWarningShown", method = RequestMethod.PUT)
    public void setWrapperOutdatedWarningShown() {
        outdatedWrapperDetector.setOutdatedWrapperDetectedWarningShown();
    }

    @ExceptionHandler(value = {UpdateException.class})
    protected ResponseEntity<ExceptionInfo> handleUpdateException(UpdateException ex) {
        String error = "An error occurred while updating or getting update infos: " + ex.getMessage();
        logger.error(error);
        return new ResponseEntity<>(new ExceptionInfo(500, error, ex.getClass().getName(), error, SessionStorage.requestUrl.get()), HttpStatus.valueOf(500));
    }

    @EventListener
    public void handleUpdateEvent(UpdateEvent updateEvent) {
        updateMessages.add(updateEvent.getMessage());
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class VersionsInfo {
        private String currentVersion;
        private String latestVersion;
        private boolean latestVersionIsBeta;
        private String betaVersion;
        private boolean updateAvailable;
        private boolean betaUpdateAvailable;
        private boolean latestVersionIgnored;
        private boolean betaVersionsEnabled;

        private boolean runInDocker;
        private boolean showUpdateBannerOnDocker;
        private boolean showWhatsNewBanner;
        private boolean wrapperOutdated;
        private String automaticUpdateToNotice;

        private UpdateManager.PackageInfo packageInfo;
    }


}
