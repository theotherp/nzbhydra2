package org.nzbhydra.web;

import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
public class WelcomeWeb {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private BaseConfigHandler baseConfigHandler;

    private static final Logger logger = LoggerFactory.getLogger(WelcomeWeb.class);

    @Secured({"ROLE_USER"})
    @GetMapping("/internalapi/welcomeshown")
    public Boolean logfileContent() {
        return configProvider.getBaseConfig().getMain().isWelcomeShown();
    }

    @Secured({"ROLE_USER"})
    @PutMapping(value = "/internalapi/welcomeshown", consumes = MediaType.ALL_VALUE)
    public void setWelcomeShown() throws IOException {
        logger.debug("Welcome screen was shown");
        configProvider.getBaseConfig().getMain().setWelcomeShown(true);
        baseConfigHandler.save(true);
    }

}
