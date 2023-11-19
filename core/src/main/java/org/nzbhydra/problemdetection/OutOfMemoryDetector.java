/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.problemdetection;

import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.logging.LogContentProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

@Component
public class OutOfMemoryDetector implements ProblemDetector {

    private enum State {
        LOOKING_FOR_OOM,
        FOUND_OOM,
        LOOKING_FOR_OOM_END
    }

    private static final Logger logger = LoggerFactory.getLogger(OutOfMemoryDetector.class);

    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private LogContentProvider logContentProvider;

    @Override
    public void executeCheck() {
        try {
            AtomicReference<State> state = new AtomicReference<>();
            state.set(State.LOOKING_FOR_OOM);
            AtomicReference<String> lastTimeStampLine = new AtomicReference<>();

            File currentLogfile = logContentProvider.getCurrentLogfile(false);
            if (!currentLogfile.exists()) {
                return;
            }
            try (Stream<String> lines = Files.lines(currentLogfile.toPath(), StandardCharsets.ISO_8859_1)) {
                lines.forEach(line -> {
                    if (line.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.*")) {
                        if (state.get() == State.LOOKING_FOR_OOM) {
                            lastTimeStampLine.set(line);
                        }
                        if (state.get() == State.LOOKING_FOR_OOM_END) {
                            state.set(State.LOOKING_FOR_OOM);
                        }
                        return;
                    }

                    if (line.contains("java.lang.OutOfMemoryError")) {
                        if (state.get() == State.LOOKING_FOR_OOM) {
                            String key = "outOfMemoryDetected-" + lastTimeStampLine.get();
                            boolean alreadyDetected = genericStorage.get(key, String.class).isPresent();
                            if (!alreadyDetected) {
                                logger.warn("The log indicates that the process ran out of memory. Please increase the XMX value in the main config and restart.");
                                genericStorage.save(key, true);
                                genericStorage.save("outOfMemoryDetected", true);
                            }
                            state.set(State.LOOKING_FOR_OOM_END);
                        }
                    }
                });
            }

        } catch (IOException e) {
            logger.warn("Unable to read log file: " + e.getMessage());
        } catch (Exception e) {
            logger.warn("Unable to detect problems in log file", e);
        }
    }

}
