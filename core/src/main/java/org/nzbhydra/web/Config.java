package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;
import org.nzbhydra.config.safeconfig.SafeConfig;
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

@RestController
public class Config {

    private static final Logger logger = LoggerFactory.getLogger(Config.class);

    @Autowired
    private ConfigProvider configProvider;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getConfig(HttpSession session) {
        return configProvider.getBaseConfig();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ConfigValidationResult setConfig(@RequestBody BaseConfig config) throws IOException {
        logger.info("Received new config");
        ConfigValidationResult result = config.validateConfig();
        if (result.isOk()) {
            configProvider.getBaseConfig().replace(config);
            configProvider.getBaseConfig().save();
        }
        return result;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config/reload", method = RequestMethod.GET)
    public GenericResponse reloadConfig() throws IOException {
        logger.info("Reloading config from file");
        try {
            configProvider.getBaseConfig().load();
        } catch (IOException e) {
            return new GenericResponse(false, e.getMessage());
        }
        return GenericResponse.ok();
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/config/safe", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public SafeConfig getSafeConfig() {
        return new SafeConfig(configProvider.getBaseConfig());
    }


}
