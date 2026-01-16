

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

    // TODO sist 16.05.2024: Make autoclosable, delete file when closed

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
