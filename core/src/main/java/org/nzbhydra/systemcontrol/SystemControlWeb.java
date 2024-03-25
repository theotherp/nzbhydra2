/*
 *  (C) Copyright 2021 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.systemcontrol;

import org.jetbrains.annotations.NotNull;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemControlWeb {

    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private SystemControl systemControl;

    private static final Logger logger = LoggerFactory.getLogger(SystemControlWeb.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/shutdown", method = RequestMethod.GET)
    public GenericResponse shutdown(@RequestParam(required = false) Integer returnCode, @RequestParam(required = false) Boolean forceShutdown) throws Exception {
        logger.info("Shutting down due to external request");
        systemControl.exitWithReturnCode(returnCode == null ? SystemControl.SHUTDOWN_RETURN_CODE : returnCode, forceShutdown != null && forceShutdown);
        return GenericResponse.ok();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/control/restart", method = RequestMethod.GET)
    public GenericResponse restart() throws Exception {
        return doRestart();
    }

    @NotNull
    private GenericResponse doRestart() {
        String baseUrl = urlCalculator.getRequestBasedUriBuilder().toUriString();
        logger.info("Shutting down due to external request. Restart will be handled by wrapper. Web interface will reload to URL {}", baseUrl);
        systemControl.exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
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
