package org.nzbhydra.misc;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;

@Component
public class UserAgentMapper {

    private static final List<String> USER_AGENTS = Arrays.asList("Sonarr", "Radarr", "CouchPotato", "LazyLibrarian", "Mozilla");

    private static final Logger logger = LoggerFactory.getLogger(UserAgentMapper.class);

    public String getUserAgent(HttpServletRequest request) {
        String header = request.getHeader("User-Agent");
        if (header == null) {
            logger.debug("No user agent provided");
            return null;
        }
        for (String toCompare : USER_AGENTS) {
            String headerLowercase = header.toLowerCase();
            if (headerLowercase.contains(toCompare.toLowerCase())) {
                logger.debug("User agent '{}Ä mapped to '{}'", header, toCompare);
                return toCompare;
            }
        }
        logger.debug("Unknown user agent '{}'", header);
        return "Other";
    }
}
