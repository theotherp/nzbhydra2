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

package org.nzbhydra.fortests;

import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.web.UrlCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.net.URL;
import java.util.Enumeration;

@RestController
public class DebugWeb {

    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private ConfigProvider configProvider;

    @RequestMapping(value = "/fortests/showCalculatedUrl", method = RequestMethod.GET)
    public String testHostSTuff(HttpServletRequest request) throws Exception {
        return urlCalculator.getRequestBasedUriBuilder().toUriString();
    }

    @RequestMapping(value = "/fortests/getHostData", method = RequestMethod.GET)
    public String getHostData(HttpServletRequest request) throws Exception {
        StringBuilder info = new StringBuilder();
        URL requestUrl = new URL(request.getRequestURL().toString());


        info.append("Config:<br>");
        info.append("Host: ").append(configProvider.getBaseConfig().getMain().getHost()).append("\r\n<br>");
        info.append("Port: ").append(configProvider.getBaseConfig().getMain().getPort()).append("\r\n<br>");
        info.append("Scheme: ").append(configProvider.getBaseConfig().getMain().isSsl() ? "https" : "http").append("\r\n<br>");

        info.append("<br>Headers:<br>");
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            String content = request.getHeader(name);
            info.append(name).append(": ").append(content).append("\r\n<br>");
        }

        info.append("<br>From request URL:<br>");
        info.append("Request URL: ").append(request.getRequestURL()).append("\r\n<br>");
        info.append("Request Host: ").append(requestUrl.getHost()).append("\r\n<br>");
        info.append("Request Port: ").append(requestUrl.getPort()).append("\r\n<br>");
        info.append("Request Protocol: ").append(requestUrl.getProtocol()).append("\r\n<br>");
        info.append("<br>From request:<br>");
        info.append("Server name: ").append(request.getServerName()).append("\r\n<br>");
        info.append("Server port: ").append(request.getServerPort()).append("\r\n<br>");
        info.append("Server protocol: ").append(request.getProtocol()).append("\r\n<br>");
        info.append("Scheme: ").append(request.getScheme()).append("\r\n<br>");
        info.append("Context path: ").append(request.getContextPath()).append("\r\n<br>");
        info.append("Servlet path: ").append(request.getServletPath()).append("\r\n<br>");

        return info.toString();
    }

}
