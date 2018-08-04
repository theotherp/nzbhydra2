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
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
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
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
public class UpdatesWeb {

    private static final Logger logger = LoggerFactory.getLogger(UpdatesWeb.class);

    private List<String> updateMessages = new ArrayList<>();

    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;

    protected Supplier<VersionsInfo> versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), 15, TimeUnit.MINUTES);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/infos", method = RequestMethod.GET)
    public VersionsInfo getVersions() throws Exception {
        if (Boolean.parseBoolean(environment.getProperty("alwayscheckforupdates", "false"))) {
            versionsInfoCache = Suppliers.memoizeWithExpiration(versionsInfoSupplier(), 15, TimeUnit.MINUTES);
        }
        return versionsInfoCache.get();
    }

    protected Supplier<VersionsInfo> versionsInfoSupplier() {
        return () -> {
            try {
                if (!configProvider.getBaseConfig().getMain().isUpdateCheckEnabled()) {
                    //Just for development
                    return new VersionsInfo("", "", false, false, false);
                }
                String currentVersion = updateManager.getCurrentVersionString();
                String latestVersion = updateManager.getLatestVersionString();
                boolean isUpdateAvailable = updateManager.isUpdateAvailable();
                boolean latestVersionIgnored = updateManager.latestVersionIgnored();
                boolean isRunInDocker = DebugInfosProvider.isRunInDocker();
                return new VersionsInfo(currentVersion, latestVersion, isUpdateAvailable, latestVersionIgnored, isRunInDocker);
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
        return updateManager.getCurrentVersionChanges();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/ignore", method = RequestMethod.PUT, consumes = MediaType.ALL_VALUE)
    public void ignore(@RequestParam("version") String version) throws Exception {
        updateManager.ignore(version);
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/installUpdate", method = RequestMethod.PUT)
    public GenericResponse installUpdate() throws Exception {
        updateMessages.clear();
        updateManager.installUpdate();
        return new GenericResponse(true, null);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/messages", method = RequestMethod.GET)
    public List<String> getUpdateMessages() throws Exception {
        return updateMessages;
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
        private boolean updateAvailable;
        private boolean latestVersionIgnored;
        private boolean runInDocker;
    }


}
