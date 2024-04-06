/*
 *  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
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

import com.gargoylesoftware.htmlunit.BrowserVersion;
import com.gargoylesoftware.htmlunit.WebClient;
import com.gargoylesoftware.htmlunit.html.HtmlButton;
import com.gargoylesoftware.htmlunit.html.HtmlForm;
import com.gargoylesoftware.htmlunit.html.HtmlPage;
import com.gargoylesoftware.htmlunit.html.HtmlTextInput;
import jakarta.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class OpenPortChecker {

    private static final Logger logger = LoggerFactory.getLogger(OpenPortChecker.class);

    public boolean isPortOpen(@Nullable String ip, String port) throws IOException {
        if (ip == null) {
            ip = getPublicIp();
        }
        try (final WebClient webClient = new WebClient(BrowserVersion.getDefault(), false, null,-1)) {
            webClient.getOptions().setThrowExceptionOnScriptError(false);
            webClient.getOptions().setCssEnabled(false);

            final HtmlPage page1 = webClient.getPage("https://portchecker.co/check");

            final HtmlForm form = page1.getForms().get(0);

            final HtmlTextInput ipField = (HtmlTextInput) page1.getForms().get(0).getElementsByTagName("input").get(0);
            ipField.setValue(ip);
            final HtmlTextInput portField = (HtmlTextInput) page1.getForms().get(0).getElementsByTagName("input").get(1);
            portField.setValue(port);
            final HtmlButton button = (HtmlButton) page1.getForms().get(0).getElementsByTagName("button").get(0);

            final HtmlPage page2 = button.click();
            final String result = page2.getElementById("results-wrapper").getTextContent();
            if (result.toLowerCase().contains("open")) {
                return true;
            } else if (result.toLowerCase().contains("closed")) {
                return false;
            } else {
                logger.error("Unable to determine if port is open from response: {}", result);
            }
        } catch (Exception e) {
            throw new IOException(e);
        }
        throw new IOException("Unable to determine if port " + port + " at public IP " + ip + " is open");
    }

    public String getPublicIp() {
        try (java.util.Scanner s = new java.util.Scanner(new java.net.URL("https://api.ipify.org").openStream(), StandardCharsets.UTF_8).useDelimiter("\\A")) {
            final String publicIp = s.next();
            logger.debug("Public IP: {}", publicIp);
            return publicIp;
        } catch (java.io.IOException e) {
            throw new RuntimeException(e);
        }
    }
}
