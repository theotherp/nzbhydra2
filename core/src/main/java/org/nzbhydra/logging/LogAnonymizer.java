package org.nzbhydra.logging;

import com.google.common.base.Strings;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.NotificationConfigEntry;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.charset.Charset;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Removes all sensitive data from the log that was not already filtered out by the log encoder
 */
@Component
public class LogAnonymizer {

    private static final Logger logger = LoggerFactory.getLogger(LogAnonymizer.class);
    private static final String IPV6_PATTERN = "(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(%\\d+)?";
    private static final String IPV4_PATTERN = "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b";

    private static final HashFunction hashFunction = Hashing.goodFastHash(20);

    @Autowired
    private ConfigProvider configProvider;

    /**
     * Anonymizes the log by removing sensitive data that was not already filtered out, e.g. the external URL, which should be displayed in the log but not visible to anybody but the user.
     *
     * @return The current log file with sensitive data removed
     */
    public String getAnonymizedLog(String log) {
        for (UserAuthConfig userAuthConfig : configProvider.getBaseConfig().getAuth().getUsers()) {
            logger.debug("Removing username from log");
            log = log.replaceAll("(?i)(user|username)([=:])" + userAuthConfig.getUsername(), "$1$2<USERNAME>");

        }
        for (IndexerConfig indexerConfig : configProvider.getBaseConfig().getIndexers()) {
            if (Strings.isNullOrEmpty(indexerConfig.getApiKey()) || indexerConfig.getApiKey().length() < 5) {
                continue;
            }
            logger.debug("Removing API key for indexer {} from log", indexerConfig.getName());
            log = log.replace(indexerConfig.getApiKey(), "<APIKEY>");
        }

        for (NotificationConfigEntry entry : configProvider.getBaseConfig().getNotificationConfig().getEntries()) {
            if (entry.getAppriseUrls() != null) {
                for (String url : entry.getAppriseUrls().split(",")) {
                    log = log.replace(url, "<hidden>");
                }
            }
        }
        if (configProvider.getBaseConfig().getNotificationConfig().getAppriseApiUrl() != null) {
            log = log.replace(configProvider.getBaseConfig().getNotificationConfig().getAppriseApiUrl(), "<hidden>");
        }

        logger.debug("Removing URL username/password from log");
        log = log.replaceAll("(https?):\\/\\/((.+?)(:(.+?)|)@)", "$1://<USERNAME>:<PASSWORD>@");
        logger.debug("Removing cookies from log");
        log = log.replaceAll("Set-Cookie: (\\w+)=(\\w)+;?", "Set-Cookie: $1:<HIDDEN>");
        log = log.replaceAll("remember-me=(\\w)+;?", "remember-me=$1:<HIDDEN>");
        log = log.replaceAll("Auth-Token=(\\w)+;?", "Auth-Token=$1:<HIDDEN>");
        log = log.replaceAll("HYDRA-XSRF-TOKEN=([\\w\\-])+;?", "HYDRA-XSRF-TOKEN=$1:<HIDDEN>");
        log = log.replaceAll("with username \\w+", "with username <HIDDEN>");
        log = log.replaceAll("from username \\w+", "with username <HIDDEN>");

        logger.debug("Removing base path from log");
        log = log.replace(new File("").getAbsolutePath(), "<BASEPATH>");

        log = removeIpsFromLog(log);

        return log;
    }

    private String removeIpsFromLog(String log) {
        logger.debug("Removing IPs and hostnames from log");
        log = log.replaceAll("Host: [^\\]]*", "Host: <hidden>");
        log = log.replace("127.0.0.1", "<localhost>");
        log = log.replace("::1", "<localhost>");
        log = replaceWithHashedValues(log, IPV4_PATTERN, "IP4");
        log = replaceWithHashedValues(log, IPV6_PATTERN, "IP6");
        return log;
    }

    private String replaceWithHashedValues(String log, String regex, final String tag) {
        Pattern ipPattern = Pattern.compile(regex);
        Matcher matcher = ipPattern.matcher(log);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String ipAddress = matcher.group(0);
            if (ipAddress.startsWith("192.168") || ipAddress.startsWith("10.") || ipAddress.startsWith("f")) {
                continue;
            }
            matcher.appendReplacement(sb, "<" + tag + ":" + hashFunction.hashString(ipAddress, Charset.defaultCharset()).toString() + ">");
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
