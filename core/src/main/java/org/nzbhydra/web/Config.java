package org.nzbhydra.web;

import com.google.common.base.Joiner;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.BaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

@RestController
public class Config {

    private static final Logger logger = LoggerFactory.getLogger(Config.class);

    @Autowired
    private BaseConfig baseConfig;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getConfig(HttpSession session) {
        return baseConfig;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ConfigValidationResult setConfig(@RequestBody BaseConfig config) throws IOException {
        logger.info("Received new config");
        List<String> messages = config.validateConfig();
        if (messages.isEmpty()) {
            baseConfig.replace(config);
            baseConfig.save();
        } else {
            logger.warn("Invalid config submitted:\n" + Joiner.on("\n").join(messages));
        }
        return new ConfigValidationResult(messages.isEmpty(), messages);
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/config/safe", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getSafeConfig() {
        //TODO
        return baseConfig;
    }

    @Data
    @AllArgsConstructor
    public class ConfigValidationResult {
        private boolean ok;
        private List<String> errorMessages;
    }
}
