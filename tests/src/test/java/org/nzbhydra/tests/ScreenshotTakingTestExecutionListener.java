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

package org.nzbhydra.tests;

import org.apache.commons.codec.binary.Base64;
import org.openqa.selenium.remote.ScreenshotException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.test.context.TestContext;
import org.springframework.test.context.support.AbstractTestExecutionListener;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class ScreenshotTakingTestExecutionListener extends AbstractTestExecutionListener {

    private static final Logger logger = LoggerFactory.getLogger(ScreenshotTakingTestExecutionListener.class);

    @Override
    public void afterTestMethod(TestContext testContext) throws Exception {
        super.afterTestMethod(testContext);
        try {
            if (testContext.getTestException() != null && testContext.getTestException().getCause() instanceof ScreenshotException) {
                File screenshotFolderFile = new File("target", "screenshots");
                screenshotFolderFile.mkdirs();
                byte[] data = Base64.decodeBase64(((ScreenshotException) testContext.getTestException().getCause()).getBase64EncodedScreenshot());
                String screenshotFileName = (testContext.getTestMethod().getDeclaringClass().getName() + "." + testContext.getTestMethod().getName() + ".png").replaceAll("[\\\\/:*?\"<>|]", "_");
                File file = new File(screenshotFolderFile, screenshotFileName);
                try (OutputStream stream = new FileOutputStream(file)) {
                    stream.write(data);
                    logger.info("Wrote screenshot to " + file.getAbsolutePath());
                } catch (Exception e1) {
                    e1.printStackTrace();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
