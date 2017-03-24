package org.nzbhydra.web;

import org.nzbhydra.config.BaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpSession;

@RestController
public class Config {

    private static final Logger logger = LoggerFactory.getLogger(Config.class);

    @Autowired
    private BaseConfig baseConfig;

    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getConfig(HttpSession session) {
        return baseConfig;
    }

    @RequestMapping(value = "/internalapi/config", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE)
    public String setConfig(@RequestBody BaseConfig config) {
        logger.info("Received new config");
        System.out.println(config);
        return "OK";
    }

    @RequestMapping(value = "/internalapi/config/safe", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getSafeConfig() {
        //TODO
        return baseConfig;
    }
}
