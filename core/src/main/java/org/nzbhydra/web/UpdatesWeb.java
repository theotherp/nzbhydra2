package org.nzbhydra.web;

import com.google.common.base.Supplier;
import com.google.common.base.Suppliers;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.update.UpdateException;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    public GenericResponse getChangesSince() throws Exception {
        return new GenericResponse(true, updateManager.getChangesSince());
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/ignore", method = RequestMethod.PUT)
    public void ignore(@RequestParam("version") String version) throws Exception {
        updateManager.ignore(version);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/versionHistory", method = RequestMethod.GET)
    public GenericResponse getVersionHistory() throws Exception {
        return new GenericResponse(true, updateManager.getFullChangelog());
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/updates/installUpdate", method = RequestMethod.PUT)
    public GenericResponse installUpdate() throws Exception {
        updateManager.installUpdate();
        return new GenericResponse(true, null);
    }


    @Data
    @AllArgsConstructor
    public class VersionsInfo {
        private String currentVersion;
        private String latestVersion;
        private boolean updateAvailable;
        private boolean latestVersionIgnored;
    }


}
