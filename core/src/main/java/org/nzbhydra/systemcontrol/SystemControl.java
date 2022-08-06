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

import org.nzbhydra.NzbHydra;
import org.nzbhydra.ShutdownEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class SystemControl {

    private static final Logger logger = LoggerFactory.getLogger(SystemControl.class);

    public static final int SHUTDOWN_RETURN_CODE = 0;
    public static final int UPDATE_RETURN_CODE = 11;
    public static final int RESTART_RETURN_CODE = 22;
    public static final int RESTORE_RETURN_CODE = 33;

    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    public void exitWithReturnCode(final int returnCode) {
        if (Boolean.parseBoolean(environment.getProperty("hydradontshutdown", "false"))) {
            logger.warn("Not shutting down because property hydradontshutdown is set");
            return;
        }
        new Thread(() -> {
            try {
                Path controlIdFilePath = new File(NzbHydra.getDataFolder(), "control.id").toPath();
                logger.debug("Writing control ID {} to {}", returnCode, controlIdFilePath);
                Files.write(controlIdFilePath, String.valueOf(returnCode).getBytes());
            } catch (IOException e) {
                logger.error("Unable to write control code to file. Wrapper might not behave as expected");
            }
            try {
                //Wait just enough for the request to be completed
                Thread.sleep(300);
                applicationEventPublisher.publishEvent(new ShutdownEvent());
                ((ConfigurableApplicationContext) NzbHydra.getApplicationContext()).close();
//                if (NzbHydra.isOsWindows()) {
//                    WindowsTrayIcon.remove();
//                }
                System.exit(returnCode);
            } catch (InterruptedException e) {
                logger.error("Error while waiting to exit", e); //Doesn't ever happen anyway
            }
        }).start();
    }
}
