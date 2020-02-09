package org.nzbhydra.logging;

import com.google.common.base.Strings;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;

/**
 * Removes all sensitive data from the log that was not already filtered out by the log encoder
 */
@Component
public class LogAnonymizer {

    private static final Logger logger = LoggerFactory.getLogger(LogAnonymizer.class);

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
        for (UserAuthConfig userAuthConfig : configProvider.getBaseConfig().getAuth().getUsers()) {
            logger.debug("Removing username from log");
            log = log.replaceAll("(?i)(user|username)([=:])" + userAuthConfig.getUsername(), "$1$2<USERNAME>");
        }
        for (IndexerConfig indexerConfig : configProvider.getBaseConfig().getIndexers()) {
            if (Strings.isNullOrEmpty(indexerConfig.getApiKey())) {
                continue;
            }
            logger.debug("Removing API key for indexer {} from log", indexerConfig.getName());
            log = log.replaceAll(indexerConfig.getApiKey(), "<APIKEY>");
        }

        logger.debug("Removing IPs from log");
        log = log.replaceAll("\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b", "<IP>");
        log = log.replaceAll("(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(%\\d+)?", "<IP>");
        logger.debug("Removing URL username/password from log");
        log = log.replaceAll("(https?):\\/\\/((.+?)(:(.+?)|)@)", "$1://<USERNAME>:<PASSWORD>@");
        logger.debug("Removing cookies from log");
        log = log.replaceAll("Set-Cookie: (\\w+)=(\\w)+;", "Set-Cookie: $1:<HIDDEN>");
        log = log.replaceAll("remember-me=(\\w)+;", "remember-me=$1:<HIDDEN>");
        log = log.replaceAll("Auth-Token=(\\w)+;", "Auth-Token=$1:<HIDDEN>");
        log = log.replaceAll("HYDRA-XSRF-TOKEN=([\\w\\-])+", "HYDRA-XSRF-TOKEN=$1:<HIDDEN>");

        logger.debug("Removing base path from log");
        log = log.replace(new File("").getAbsolutePath(), "<BASEPATH>");

        return log;
    }

}
