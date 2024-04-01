/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.misc;

import org.apache.commons.lang3.RandomStringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

@Configuration
public class TempFileProvider {

    private static final Logger logger = LoggerFactory.getLogger(TempFileProvider.class);

    @Autowired
    private ConfigurableEnvironment environment;

    public File getTempFile(String postFix, String extension) throws IOException {
        String nzbhydraTempFolder = environment.getProperty("NZBHYDRA_TEMP_FOLDER", String.class);
        if (nzbhydraTempFolder != null) {
            logger.info("Using temp folder {} defined by property NZBHYDRA_TEMP_FOLDER", nzbhydraTempFolder);
            return new File(nzbhydraTempFolder, "nzbhydra" + RandomStringUtils.randomAlphanumeric(5) + extension);
        } else {
            return Files.createTempFile("nzbhydra-" + postFix, extension).toFile();
        }
    }


}
