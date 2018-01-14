package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ControlWeb {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UpdateManager updateManager;

    private static final Logger logger = LoggerFactory.getLogger(ControlWeb.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/shutdown", method = RequestMethod.GET)
    public GenericResponse shutdown() throws Exception {
        logger.info("Shutting down due to external request");
        updateManager.exitWithReturnCode(UpdateManager.SHUTDOWN_RETURN_CODE);
        return GenericResponse.ok();
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/restart", method = RequestMethod.GET)
    public GenericResponse restart() throws Exception {
        String baseUrl = SessionStorage.getUrlBuilder().toUriString();
        logger.info("Shutting down due to external request. Restart will be handled by wrapper. Web interface will reload to URL {}", baseUrl);
        updateManager.exitWithReturnCode(UpdateManager.RESTART_RETURN_CODE);
        logger.debug("Returning restart OK");
        //Return base URL so that web interface can ping that and go there
        return GenericResponse.ok(baseUrl);
    }

    @CrossOrigin //Allow pinging when base URL has changed
    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/ping", method = RequestMethod.GET)
    public GenericResponse ping() throws Exception {
        return GenericResponse.ok();
    }


}
