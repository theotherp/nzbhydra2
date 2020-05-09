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

import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.base.Joiner;
import com.google.common.hash.HashCode;
import com.google.common.hash.Hashing;
import com.google.common.io.Files;
import org.nzbhydra.Jackson;
import org.nzbhydra.genericstorage.GenericStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class OutdatedWrapperDetector implements ProblemDetector {

    private static final Logger logger = LoggerFactory.getLogger(OutdatedWrapperDetector.class);
    public static final String KEY_OUTDATED_WRAPPER_DETECTED = "outdatedWrapperDetected";
    private static final String KEY_OUTDATED_WRAPPER_DETECTED_WARNING_DISPLAYED = "outdatedWrapperDetectedWarningDisplayed";

    @Autowired
    private GenericStorage genericStorage;

    @Override
    public void executeCheck() {
        detectOutdatedWrapper();
    }

    public boolean isOutdatedWrapperDetected() {
        return genericStorage.get(KEY_OUTDATED_WRAPPER_DETECTED, Boolean.class).orElse(false);
    }

    public boolean isOutdatedWrapperDetectedWarningNotYetShown() {
        return !genericStorage.get(KEY_OUTDATED_WRAPPER_DETECTED_WARNING_DISPLAYED, Boolean.class).orElse(false);
    }

    public void setOutdatedWrapperDetectedWarningShown() {
        genericStorage.save(KEY_OUTDATED_WRAPPER_DETECTED_WARNING_DISPLAYED, true);
    }

    private void detectOutdatedWrapper() {
        List<String> wrapperFilenames = Arrays.asList("NZBHydra2.exe", "NZBHydra2 Console.exe", "nzbhydra2", "nzbhydra2wrapper.py", "nzbhydra2wrapperPy3.py");
        Map<String, String> filenamesToExpectedHashes;
        try {
            filenamesToExpectedHashes = Jackson.JSON_MAPPER.readValue(OutdatedWrapperDetector.class.getResource("/wrapperHashes.json"), new TypeReference<Map<String, String>>() {
            });
        } catch (IOException e) {
            logger.error("Error while trying to read wrapper hashes", e);
            return;
        }

        boolean anyWrapperFileFound = wrapperFilenames.stream().anyMatch(x -> new File(x).exists());
        if (!anyWrapperFileFound) {
            logger.error("Didn't find any of the expected wrapper files ({}) in folder {}", new File("").getAbsolutePath(), Joiner.on(", ").join(wrapperFilenames));
            return;
        }
        for (String filename : wrapperFilenames) {
            File wrapperFile = new File(filename);
            boolean outdatedWrapperFound = false;
            if (wrapperFile.exists()) {
                try {
                    HashCode hash = Files.hash(wrapperFile, Hashing.sha1());
                    final String expectedHash = filenamesToExpectedHashes.get(filename);
                    final String actualHash = hash.toString();
                    if (!expectedHash.equals(actualHash)) {
                        logger.warn("Outdated file: {}. Expected hash: {}. Actual hash: {}", wrapperFile, expectedHash, actualHash);
                        outdatedWrapperFound = true;

                    }
                } catch (IOException e) {
                    logger.error("Unable to hash file " + wrapperFile, e);
                }
                if (outdatedWrapperFound) {
                    genericStorage.save(KEY_OUTDATED_WRAPPER_DETECTED_WARNING_DISPLAYED, false);
                    genericStorage.save(KEY_OUTDATED_WRAPPER_DETECTED, true);
                    logger.warn("The NZBHydra wrappers (i.e. the executables or python scripts you use to run NZBHydra) seem to be outdated. Please update them:\n" +
                            "Shut down NZBHydra, download the latest version and extract *all files* into your main NZBHydra folder (overwriting all). Start NZBHydra again.");
                } else {
                    genericStorage.save(KEY_OUTDATED_WRAPPER_DETECTED, false);
                }
            }
        }
    }

}
