

package org.nzbhydra.fortests;

import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.web.UrlCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.net.URL;
import java.util.Enumeration;

@RestController
public class DebugWeb {

    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private ConfigProvider configProvider;

    @Secured({"ROLE_ADMIN"})
    @GetMapping("/fortests/showCalculatedUrl")
    public String testHostSTuff(HttpServletRequest request) throws Exception {
        return urlCalculator.getRequestBasedUriBuilder().toUriString();
    }

    /**
     * Echoes all request headers, session and remember-me cookies included, so only admins may see it. Every value is
     * HTML-escaped because the result is rendered as HTML.
     */
    @Secured({"ROLE_ADMIN"})
    @GetMapping("/fortests/getHostData")
    public String getHostData(HttpServletRequest request) throws Exception {
        StringBuilder info = new StringBuilder();
        URL requestUrl = new URL(request.getRequestURL().toString());


        info.append("Config:<br>");
        info.append("Host: ").append(escape(configProvider.getBaseConfig().getMain().getHost())).append("\r\n<br>");
        info.append("Port: ").append(escape(configProvider.getBaseConfig().getMain().getPort())).append("\r\n<br>");
        info.append("Scheme: ").append(escape(configProvider.getBaseConfig().getMain().isSsl() ? "https" : "http")).append("\r\n<br>");

        info.append("<br>Headers:<br>");
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            String content = request.getHeader(name);
            info.append(escape(name)).append(": ").append(escape(content)).append("\r\n<br>");
        }

        info.append("<br>From request URL:<br>");
        info.append("Request URL: ").append(escape(request.getRequestURL())).append("\r\n<br>");
        info.append("Request Host: ").append(escape(requestUrl.getHost())).append("\r\n<br>");
        info.append("Request Port: ").append(escape(requestUrl.getPort())).append("\r\n<br>");
        info.append("Request Protocol: ").append(escape(requestUrl.getProtocol())).append("\r\n<br>");
        info.append("<br>From request:<br>");
        info.append("Server name: ").append(escape(request.getServerName())).append("\r\n<br>");
        info.append("Server port: ").append(escape(request.getServerPort())).append("\r\n<br>");
        info.append("Server protocol: ").append(escape(request.getProtocol())).append("\r\n<br>");
        info.append("Scheme: ").append(escape(request.getScheme())).append("\r\n<br>");
        info.append("Context path: ").append(escape(request.getContextPath())).append("\r\n<br>");
        info.append("Servlet path: ").append(escape(request.getServletPath())).append("\r\n<br>");

        return info.toString();
    }

    private static String escape(Object value) {
        return HtmlUtils.htmlEscape(String.valueOf(value));
    }

}
