package org.nzbhydra.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Control {

    private static final Logger logger = LoggerFactory.getLogger(Control.class);

    @RequestMapping(value = "/internalapi/control/shutdown", method = RequestMethod.GET)
    public String shutdown() throws Exception {
        logger.info("Shutting down due to external request");
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    logger.error("Error waiting until shutdown", e); //Doesn't ever happen anyway
                }
                System.exit(0);
            }
        }).run();
        return "OK";
    }

}
