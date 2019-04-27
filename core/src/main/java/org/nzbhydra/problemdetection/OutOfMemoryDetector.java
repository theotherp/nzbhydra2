/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Optional;

@Component
public class OutOfMemoryDetector implements ProblemDetector {

    private static final Logger logger = LoggerFactory.getLogger(OutOfMemoryDetector.class);

    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private LogContentProvider logContentProvider;

    @Override
    public void executeCheck() {
        try {
            List<String> logLines = Files.readAllLines(logContentProvider.getCurrentLogfile(false).toPath());
            for (int i = logLines.size() - 1; i >= 0; i--) {
                String logLine = logLines.get(i);
                if (logLine.contains("java.lang.OutOfMemoryError")) {
                    Optional<String> timestampLine = logLines.subList(i, logLines.size() - 1).stream().filter(x -> x.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.*")).findFirst();
                    String key = "outOfMemoryDetected-";
                    if (timestampLine.isPresent()) {
                        key += timestampLine.get().substring(0, 25);
                    }
                    boolean alreadyDetected = genericStorage.get(key, String.class).isPresent();
                    if (!alreadyDetected) {
                        logger.warn("The log indicates that the process ran out of memory. Please increase the XMX value in the main config and restart.");
                        genericStorage.save(key, true);
                        genericStorage.save("outOfMemoryDetected", true);
                    }
                    break;
                }
            }
        } catch (IOException e) {
            logger.warn("Unable to read log file: " + e.getMessage());
        } catch (Exception e) {
            logger.warn("Unable to detect problems in log file", e);
        }
    }

}
