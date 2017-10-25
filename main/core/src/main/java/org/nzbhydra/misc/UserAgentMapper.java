package org.nzbhydra.misc;

import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class UserAgentMapper {

    private static final List<String> USER_AGENTS = Arrays.asList("Sonarr", "Radarr", "CouchPotato", "LazyLibrarian", "Mozilla");

    private static final Logger logger = LoggerFactory.getLogger(UserAgentMapper.class);

    public String getUserAgent(String userAgent) {
        if (userAgent == null) {
            logger.debug(LoggingMarkers.USER_AGENT, "No user agent provided");
            return null;
        }
        for (String toCompare : USER_AGENTS) {
            String headerLowercase = userAgent.toLowerCase();
            if (headerLowercase.contains(toCompare.toLowerCase())) {
                logger.debug(LoggingMarkers.USER_AGENT, "User agent '{} mapped to '{}'", userAgent, toCompare);
                return toCompare;
            }
        }
        logger.debug(LoggingMarkers.USER_AGENT, "Unknown user agent '{}'", userAgent);
        return "Other";
    }
}
