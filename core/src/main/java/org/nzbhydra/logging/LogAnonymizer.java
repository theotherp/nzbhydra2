package org.nzbhydra.logging;

import com.google.common.base.Strings;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import org.nzbhydra.auth.HeaderAuthenticationFilter;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ExternalToolConfig;
import org.nzbhydra.config.NotificationConfigEntry;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.externalapi.ExternalApiKeyFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
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
    //The user as written by MdcLogConverter, e.g. "[ID: 12345, User: someuser] "
    private static final Pattern MDC_USER_PATTERN = Pattern.compile("(User: )([^\\]\\n]+)(\\])");
    private static final Pattern INTERNAL_API_KEY_PATTERN = Pattern.compile("(internalApiKey=)[^&\\s\"']+");
    //Technical principals, not users, and useful to tell API from UI requests
    private static final Set<String> NON_USER_PRINCIPALS = Set.of(ExternalApiKeyFilter.PRINCIPAL, HeaderAuthenticationFilter.INTERNAL_API_PRINCIPAL);

    private static final HashFunction hashFunction = Hashing.goodFastHash(20);

    @Autowired
    private ConfigProvider configProvider;

    /**
     * Anonymizes the log by removing sensitive data that was not already filtered out, e.g. the external URL, which should be displayed in the log but not visible to anybody but the user.
     *
     * @return The current log file with sensitive data removed
     */
    public String getAnonymizedLog(String log) {
        log = removeInternalApiKey(log);
        logger.debug("Removing usernames of logged requests from log");
        //Covers users not known in the config, e.g. those logged in via OIDC or header auth
        Matcher mdcUserMatcher = MDC_USER_PATTERN.matcher(log);
        log = mdcUserMatcher.replaceAll(x -> Matcher.quoteReplacement(NON_USER_PRINCIPALS.contains(x.group(2)) ? x.group() : x.group(1) + anonymizeUsername(x.group(2)) + x.group(3)));
        for (UserAuthConfig userAuthConfig : configProvider.getBaseConfig().getAuth().getUsers()) {
            if (Strings.isNullOrEmpty(userAuthConfig.getUsername())) {
                continue;
            }
            logger.debug("Removing username from log");
            log = log.replaceAll("(?i)(user|username)([=:]\\s*)" + Pattern.quote(userAuthConfig.getUsername()), "$1$2<USERNAME>");

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
        logger.debug("Removing hosts and keys identifying the user from log");
        for (String value : getIdentifyingConfigValues()) {
            log = log.replace(value, "<hidden>");
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

    /**
     * @return A replacement for the given username which is the same for the same username (while this instance runs)
     * but does not allow deriving it
     */
    public String anonymizeUsername(String username) {
        return "<USER:" + hashFunction.hashString(username, Charset.defaultCharset()).toString() + ">";
    }

    /**
     * Replaces IP addresses like {@link #getAnonymizedLog(String)} does, for texts that are not logs.
     */
    public String anonymizeIps(String text) {
        return hashIps(text);
    }

    /**
     * The internal API key authenticates as admin. The one of the running instance is replaced wherever it appears,
     * any other one (e.g. from earlier runs, logged by older wrappers) where it is passed as a parameter.
     */
    private String removeInternalApiKey(String log) {
        String internalApiKey = System.getProperty(HeaderAuthenticationFilter.INTERNAL_API_KEY_PARAMETER);
        if (!Strings.isNullOrEmpty(internalApiKey)) {
            log = log.replace(internalApiKey, "<hidden>");
        }
        return INTERNAL_API_KEY_PATTERN.matcher(log).replaceAll("$1<hidden>");
    }

    /**
     * Values hidden in the config included in the debug infos which may also appear in the log. Trailing slashes are
     * removed so that URLs are also found when a path was appended. Very short values are skipped as they would
     * replace unrelated text.
     */
    private List<String> getIdentifyingConfigValues() {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        AuthConfig auth = baseConfig.getAuth();
        List<String> values = new ArrayList<>(Arrays.asList(auth.getOidcIssuerUri(), auth.getOidcAuthorizationUri(), auth.getOidcTokenUri(), auth.getOidcUserInfoUri(),
                auth.getOidcJwkSetUri(), auth.getOidcClientId(), baseConfig.getDownloading().getExternalUrl().orElse(null),
                baseConfig.getEmby().getEmbyBaseUrl(), baseConfig.getEmby().getEmbyApiKey()));
        for (ExternalToolConfig externalTool : baseConfig.getExternalTools().getExternalTools()) {
            values.add(externalTool.getHost());
            values.add(externalTool.getApiKey());
            values.add(externalTool.getNzbhydraHost());
        }
        for (IndexerConfig indexerConfig : baseConfig.getIndexers()) {
            values.addAll(indexerConfig.getCustomParameters());
        }
        return values.stream()
                .filter(x -> !Strings.isNullOrEmpty(x))
                .map(x -> x.endsWith("/") ? x.substring(0, x.length() - 1) : x)
                .filter(x -> x.length() >= 5)
                .toList();
    }

    private String removeIpsFromLog(String log) {
        logger.debug("Removing IPs and hostnames from log");
        log = log.replaceAll("Host: [^\\]]*", "Host: <hidden>");
        return hashIps(log);
    }

    private String hashIps(String log) {
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
            //0.0.0.0 is the "all interfaces" address, it does not identify anybody
            if (ipAddress.startsWith("192.168") || ipAddress.startsWith("10.") || ipAddress.startsWith("f") || ipAddress.equals("0.0.0.0")) {
                continue;
            }
            matcher.appendReplacement(sb, "<" + tag + ":" + hashFunction.hashString(ipAddress, Charset.defaultCharset()).toString() + ">");
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
