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

package org.nzbhydra.fortests;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.web.UrlCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
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
        String info = "";
        URL requestUrl = new URL(request.getRequestURL().toString());


        info +="Config:<br>";
        info += "Host: " + configProvider.getBaseConfig().getMain().getHost() + "\r\n<br>";
        info += "Port: " + configProvider.getBaseConfig().getMain().getPort() + "\r\n<br>";
        info += "Scheme: " + (configProvider.getBaseConfig().getMain().isSsl() ? "https" : "http") + "\r\n<br>";

        info +="<br>Headers:<br>";
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            String content = request.getHeader(name);
            info += name + ": " + content + "\r\n<br>";
        }

        info +="<br>From request URL:<br>";
        info += "Request URL: " + request.getRequestURL() + "\r\n<br>";
        info += "Request Host: " + requestUrl.getHost() + "\r\n<br>";
        info += "Request Port: " + requestUrl.getPort() + "\r\n<br>";
        info += "Request Protocol: " + requestUrl.getProtocol() + "\r\n<br>";
        info +="<br>From request:<br>";
        info += "Server name: " + request.getServerName() + "\r\n<br>";
        info += "Server port: " + request.getServerPort() + "\r\n<br>";
        info += "Server protocol: " + request.getProtocol() + "\r\n<br>";
        info += "Scheme: " + request.getScheme() + "\r\n<br>";
        info += "Context path: " + request.getContextPath() + "\r\n<br>";
        info += "Servlet path: " + request.getServletPath() + "\r\n<br>";

        return info;
    }

}
