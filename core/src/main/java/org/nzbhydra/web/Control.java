package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Control {

    @Autowired
    private UpdateManager updateManager;

    private static final Logger logger = LoggerFactory.getLogger(Control.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/shutdown", method = RequestMethod.GET)
    public GenericResponse shutdown() throws Exception {
        logger.info("Shutting down due to external request");
        new Thread(() -> {
            try {
                Thread.sleep(100);
                NzbHydra.shutdown();
            } catch (InterruptedException e) {
                logger.error("Error", e);
            }
        }).start();
        return GenericResponse.ok();
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/restart", method = RequestMethod.GET)
    public GenericResponse restart() throws Exception {
        logger.info("Restarting due to external request");
        new Thread(() -> {
            try {
                Thread.sleep(100);
                NzbHydra.restart();
            } catch (InterruptedException e) {
                logger.error("Error", e);
            }
        }).start();
        return GenericResponse.ok();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/ping", method = RequestMethod.GET)
    public GenericResponse ping() throws Exception {
        return GenericResponse.ok();
    }


}
