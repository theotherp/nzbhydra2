package org.nzbhydra.misc;

import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class UserAgentMapper {

    @Autowired
    private SearchingConfig searchingConfig;

    private static final Logger logger = LoggerFactory.getLogger(UserAgentMapper.class);

    public String getUserAgent(String userAgent) {
        if (userAgent == null) {
            logger.debug(LoggingMarkers.USER_AGENT, "No user agent provided");
            return null;
        }
        String headerLowercase = userAgent.toLowerCase();
        for (String toCompare : searchingConfig.getUserAgents()) {
            if (headerLowercase.contains(toCompare.toLowerCase())) {
                logger.debug(LoggingMarkers.USER_AGENT, "User agent '{} mapped to '{}'", userAgent, toCompare);
                return toCompare;
            }
        }
        logger.debug(LoggingMarkers.USER_AGENT, "Unknown user agent '{}'", userAgent);
        return "Other";
    }
}
