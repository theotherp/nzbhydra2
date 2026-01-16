

package org.nzbhydra.problemdetection;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.misc.OpenPortChecker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Component
public class OpenPortProblemDetector implements ProblemDetector {

    private static final Logger logger = LoggerFactory.getLogger(OpenPortProblemDetector.class);
    private static final int CHECK_EVERY_DAYS = 14;
    static final String KEY = "PORT_OPEN_LAST_CHECK";
    static final String WARNING_KEY = "showOpenToInternetWithoutAuth";

    @Autowired
    private OpenPortChecker openPortChecker;
    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ConfigProvider configProvider;

    @Override
    public void executeCheck() {
        try {
            final AuthType authType = configProvider.getBaseConfig().getAuth().getAuthType();
            if (!configProvider.getBaseConfig().getMain().isCheckOpenPort()) {
                logger.debug("Not checking for open port because check is disabled");
                return;
            }
            if (authType != AuthType.NONE) {
                logger.debug("Not checking for open port because auth method is {}", authType);
                return;
            }
            final Optional<Instant> data = genericStorage.get(KEY, Instant.class);
            if (data.isPresent() && data.get().isAfter(Instant.now().minus(CHECK_EVERY_DAYS, ChronoUnit.DAYS))) {
                logger.debug("Not checking for open port because last check was less than {} days ago", CHECK_EVERY_DAYS);
                return;
            }
            final String port = String.valueOf(configProvider.getBaseConfig().getMain().getPort());
            final String publicIp = openPortChecker.getPublicIp();
            final boolean portOpen = openPortChecker.isPortOpen(publicIp, port);
            if (!portOpen) {
                logger.debug("It looks like NZBHydra is not open to the internet under public IP {} and port {}.", publicIp, port);
                return;
            }
            logger.debug("Determined that the currently chosen port is open under the public address while no authentication method is selected.");
            logger.warn("Apparently NZBHydra is reachable from the internet via public IP {} and port {}. Please either make it not reachable or enable an authentication method to protect your data.", publicIp, port);
            genericStorage.setNoSave(KEY, Instant.now());
            genericStorage.save(WARNING_KEY, true);
        } catch (Exception e) {
            logger.error("Error determining if NZBHydra is exposed to the internet");
        }
    }


}
