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
        //LATER chunk up so it can handle big files
        String log = logContentProvider.getLog();
        Optional<String> externalUrlOptional = configProvider.getBaseConfig().getMain().getExternalUrl();
        if (externalUrlOptional.isPresent()) {
            log = log.replaceAll("(?i)" + externalUrlOptional.get(), "<EXTERNALURL>");
        }
        for (UserAuthConfig userAuthConfig : configProvider.getBaseConfig().getAuth().getUsers()) {
            log = log.replaceAll("(?i)User[=:]" + userAuthConfig.getUsername(), "User=<USERNAME>");
        }
        log = log.replaceAll("\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b", "<IP>");
        log = log.replaceAll("(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))", "<IP>");

        return log;
    }

}
