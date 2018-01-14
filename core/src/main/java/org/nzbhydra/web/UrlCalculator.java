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

package org.nzbhydra.web;

import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import javax.servlet.http.HttpServletRequest;

@Component
public class UrlCalculator {

    static final Logger logger = LoggerFactory.getLogger(UrlCalculator.class);

    @Autowired
    private ConfigurableEnvironment environment;

    public UriComponentsBuilder getBaseUriBuilder(HttpServletRequest request) {
        String scheme;
        String host = null;
        Integer port = null;
        String path;

        //Reverse proxies send the x-forwarded-proto header when HTTPS is enabled
        if ("https".equalsIgnoreCase(request.getHeader("x-forwarded-proto"))) {
            logger.debug(LoggingMarkers.URL_CALCULATION, "Using scheme HTTPS because header x-forwarded-proto is set");
            scheme = "https";
        } else if (Boolean.parseBoolean(environment.getProperty("server.ssl.enabled"))) {
            logger.debug(LoggingMarkers.URL_CALCULATION, "Using scheme HTTPS because header x-forwarded-proto is not set and built-in SSL is enabled");
            scheme = "https";
        } else {
            logger.debug(LoggingMarkers.URL_CALCULATION, "Using scheme HTTP because header x-forwarded-proto is not set and built-in SSL is disabled");
            scheme = "http";
        }

        String forwardedHost = request.getHeader("x-forwarded-host"); //Looks like this: mydomain.com:4000
        if (forwardedHost != null) {
            int colonIndex = forwardedHost.indexOf(":");
            if (colonIndex > -1) {
                host = forwardedHost.substring(0, colonIndex);
                port = Integer.valueOf(forwardedHost.substring(colonIndex + 1));
                logger.debug(LoggingMarkers.URL_CALCULATION, "Using host {} and port {} from header x-forwarded-proto {}", host, port, forwardedHost);
            } else {
                //Asuming port 80 is meant but the header should always also contain the port!
                logger.warn("Header x-forwarded-host does not contain port. Please change your reverse proxy configuration. See https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies for more information");
            }
        } else {
            host = request.getHeader("host");
            if (host == null) {
                logger.warn("Header host not set. Please change your reverse proxy configuration. See https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies for more information");
                host = request.getServerName();
            } else {
                int colonIndex = host.indexOf(":"); //Apache includes the port in the host header
                if (colonIndex >-1) {
                    host = host.substring(0, colonIndex);
                }
                logger.debug(LoggingMarkers.URL_CALCULATION, "Using host {} from host header", host);
            }
        }

        if (port == null) { //No x-forwarded-host header found, use server port (configured port should also work)
            port = request.getServerPort();
            logger.debug(LoggingMarkers.URL_CALCULATION, "Header x-forwarded-host not set. Using port {} from server", port);
        }

        path = request.getContextPath();
        logger.debug(LoggingMarkers.URL_CALCULATION, "Using context path {} as path", path);

        return UriComponentsBuilder.newInstance()
                .host(host)
                .scheme(scheme)
                .port(port)
                .path(path);
    }

}
