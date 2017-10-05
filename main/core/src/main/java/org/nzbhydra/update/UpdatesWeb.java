package org.nzbhydra.update;

import com.google.common.base.Supplier;
import com.google.common.base.Suppliers;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.ExceptionInfo;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
public class UpdatesWeb {

    private static final Logger logger = LoggerFactory.getLogger(UpdatesWeb.class);

    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private ConfigProvider configProvider;

    protected Supplier<VersionsInfo> versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), 15, TimeUnit.MINUTES);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/infos", method = RequestMethod.GET)
    public VersionsInfo getVersions() throws Exception {
        return versionsInfoCache.get();
    }

    protected Supplier<VersionsInfo> versionsInfoSupplier() {
        return () -> {
            try {
                if (!configProvider.getBaseConfig().getMain().isUpdateCheckEnabled()) {
                    //Just for development
                    return new VersionsInfo("", "", false, false);
                }
                String currentVersion = updateManager.getCurrentVersionString();
                String latestVersion = updateManager.getLatestVersionString();
                boolean isUpdateAvailable = updateManager.isUpdateAvailable();
                boolean latestVersionIgnored = updateManager.latestVersionIgnored();
                return new VersionsInfo(currentVersion, latestVersion, isUpdateAvailable, latestVersionIgnored);
            } catch (UpdateException e) {
                logger.error("An error occured while getting version information", e);
                throw new RuntimeException("Unable to get update information");
            }
        };
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/changesSince", method = RequestMethod.GET)
    public List<ChangelogVersionEntry> getChangesSince() throws Exception {
        return updateManager.getChangesSinceCurrentVersion();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/versionHistory", method = RequestMethod.GET)
    public List<ChangelogVersionEntry> getVersionHistory() throws Exception {
        return updateManager.getAllChanges();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/ignore", method = RequestMethod.PUT, consumes = MediaType.ALL_VALUE)
    public void ignore(@RequestParam("version") String version) throws Exception {
        updateManager.ignore(version);
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/installUpdate", method = RequestMethod.PUT)
    public GenericResponse installUpdate() throws Exception {
        updateManager.installUpdate();
        return new GenericResponse(true, null);
    }

    @ExceptionHandler(value = {UpdateException.class})
    protected ResponseEntity<ExceptionInfo> handleUpdateException(UpdateException ex) {
        String error = "An error occurred while updating or getting update infos: " + ex.getMessage();
        logger.error(error);
        return new ResponseEntity<>(new ExceptionInfo(500, error, ex.getClass().getName(), error, SessionStorage.requestUrl.get()), HttpStatus.valueOf(500));
    }


    @Data
    @AllArgsConstructor
    public static class VersionsInfo {
        private String currentVersion;
        private String latestVersion;
        private boolean updateAvailable;
        private boolean latestVersionIgnored;
    }


}
