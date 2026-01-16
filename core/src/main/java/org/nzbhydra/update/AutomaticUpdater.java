

package org.nzbhydra.update;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.tasks.HydraTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AutomaticUpdater {

    public static String TO_NOTICE_KEY = "automaticUpdateToNotice";

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private GenericStorage genericStorage;

    private static final Logger logger = LoggerFactory.getLogger(AutomaticUpdater.class);

    private static final long HOUR = 1000 * 60 * 60;

    @HydraTask(configId = "installUpdate", name = "Check for and install updates", interval = HOUR)
    @Transactional
    public void checkAndInstall() {
        try {
            if (updateManager.isUpdatedExternally()) {
                return;
            }
            final UpdateManager.UpdateInfo updateInfo = updateManager.getUpdateInfo();
            if (configProvider.getBaseConfig().getMain().isUpdateAutomatically() && updateInfo.isUpdateAvailable()) {
                logger.info("Automatic updater found update");

                updateManager.installUpdate(updateInfo.getLatestVersion(), true);
            }
        } catch (UpdateException e) {
            logger.error("Error while installing update", e);
        }
    }

}
