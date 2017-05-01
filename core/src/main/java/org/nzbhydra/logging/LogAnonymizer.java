package org.nzbhydra.logging;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.UserAuthConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

/**
 * Removes all sensitive data from the log that was not already filtered out by the log encoder
 */
@Component
public class LogAnonymizer {

    @Autowired
    private LogContentProvider logContentProvider;
    @Autowired
    private ConfigProvider configProvider;

    /**
     * Anonymizes the log by removing sensitive data that was not already filtered out, e.g. the external URL, which should be displayed in the log but not visible to anybody but the user.
     *
     * @return The current log file with sensitive data removed
     * @throws IOException Unable to read log file
     */
    public String getAnonymizedLog() throws IOException {
        String log = logContentProvider.getLog();
        Optional<String> externalUrlOptional = configProvider.getBaseConfig().getMain().getExternalUrl();
        if (externalUrlOptional.isPresent()) {
            log = log.replaceAll(externalUrlOptional.get(), "<EXTERNALURL>");
        }
        for (UserAuthConfig userAuthConfig : configProvider.getBaseConfig().getAuth().getUsers()) {
            log = log.replaceAll("User=" + userAuthConfig.getUsername(), "User:<USERNAME>");
        }

        return log;
    }

}
