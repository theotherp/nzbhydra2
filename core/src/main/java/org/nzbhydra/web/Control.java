package org.nzbhydra.web;

import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Control {

    private static final Logger logger = LoggerFactory.getLogger(Control.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/shutdown", method = RequestMethod.GET)
    public String shutdown() throws Exception {
        logger.info("Shutting down due to external request");
        exitWithReturnCode(0);
        return "OK";
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/restart", method = RequestMethod.GET)
    public String restart() throws Exception {
        logger.info("Shutting down due to external request. Restart will be handled by wrapper");
        exitWithReturnCode(2);
        return "OK";
    }

    private void exitWithReturnCode(final int returnCode) {
        new Thread(() -> {
            try {
                //Wait just enough for the request to be completed
                Thread.sleep(100);
            } catch (InterruptedException e) {
                logger.error("Error while waiting to exit", e); //Doesn't ever happen anyway
            }
            //System.exit(returnCode);
            SpringApplication.exit(NzbHydra.getApplicationContext(), (ExitCodeGenerator) () -> returnCode);
        }).run();
    }

}
