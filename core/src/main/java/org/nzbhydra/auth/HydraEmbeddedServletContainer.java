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

package org.nzbhydra.auth;

import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ValveBase;
import org.apache.tomcat.util.buf.MessageBytes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.embedded.ConfigurableEmbeddedServletContainer;
import org.springframework.boot.context.embedded.EmbeddedServletContainerCustomizer;
import org.springframework.boot.context.embedded.tomcat.TomcatEmbeddedServletContainerFactory;
import org.springframework.stereotype.Component;

import javax.servlet.ServletException;
import java.io.IOException;

/**
 * Sets the correct scheme when behind a reverse proxy. According to https://docs.spring.io/spring-boot/docs/current-SNAPSHOT/reference/htmlsingle/#howto-use-tomcat-behind-a-proxy-server this
 * should aready work when server.use-forward-headers is true but it doesn't
 */
@Component
public class HydraEmbeddedServletContainer implements EmbeddedServletContainerCustomizer {

    private static final Logger logger = LoggerFactory.getLogger(HydraEmbeddedServletContainer.class);

    @Override
    public void customize(ConfigurableEmbeddedServletContainer container) {
        if (!(container instanceof TomcatEmbeddedServletContainerFactory)) {
            return; //Is the case in tests
        }
        TomcatEmbeddedServletContainerFactory containerFactory = (TomcatEmbeddedServletContainerFactory) container;

        containerFactory.addContextValves(new ValveBase() {
            @Override
            public void invoke(Request request, Response response) throws IOException, ServletException {
                int originalPort = -1;
                final String forwardedPort = request.getHeader("X-Forwarded-Port");
                if (forwardedPort != null) {
                    try {
                        originalPort = request.getServerPort();
                        request.setServerPort(Integer.valueOf(forwardedPort));
                    } catch (final NumberFormatException e) {
                        logger.debug("ignoring forwarded port {}", forwardedPort);
                    }
                }

                final MessageBytes serverNameMB = request.getCoyoteRequest().serverName();
                String originalServerName = null;
                String forwardedHost = request.getHeader("X-Forwarded-Host");
                if (forwardedHost == null) {
                    forwardedHost = request.getHeader("host");
                }
                if (forwardedHost != null) {
                    int colonIndex = forwardedHost.indexOf(":");
                    if (colonIndex > -1) {
                        if (originalPort == -1) {
                            originalPort = request.getServerPort();
                        }
                        request.setServerPort(Integer.valueOf(forwardedHost.substring(colonIndex + 1)));
                        forwardedHost = forwardedHost.substring(0, colonIndex);
                    }
                    originalServerName = serverNameMB.getString();
                    serverNameMB.setString(forwardedHost);
                }

                Boolean originallySecure = null;
                final String forwardedProto = request.getHeader("X-Forwarded-Proto");
                if (forwardedProto != null) {
                    originallySecure = request.isSecure();
                    request.setSecure(forwardedProto.equalsIgnoreCase("https"));
                }

                try {
                    getNext().invoke(request, response);
                } finally {
                    if (originallySecure != null) {
                        request.setSecure(originallySecure);
                    }
                    if (forwardedHost != null) {
                        serverNameMB.setString(originalServerName);
                    }
                    if (forwardedPort != null) {
                        request.setServerPort(originalPort);
                    }

                }
            }
        });
        ((TomcatEmbeddedServletContainerFactory) container).addContextCustomizers(context -> {
            context.setMapperContextRootRedirectEnabled(true);
        });


    }
}
