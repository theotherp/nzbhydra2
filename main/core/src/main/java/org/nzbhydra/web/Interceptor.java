package org.nzbhydra.web;

import com.google.common.base.Strings;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.misc.UserAgentMapper;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.handler.HandlerInterceptorAdapter;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Component
public class Interceptor extends HandlerInterceptorAdapter {
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UserAgentMapper userAgentMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null) {
            ip = ip.split(",")[0];
        } else {
            ip = request.getRemoteAddr();
        }
        if (configProvider.getBaseConfig().getMain().getLogging().isLogIpAddresses()) {
            MDC.put("IPADDRESS", ip);
        }
        if (configProvider.getBaseConfig().getMain().getLogging().isLogUsername() && !Strings.isNullOrEmpty(request.getRemoteUser())) {
            MDC.put("USERNAME", request.getRemoteUser());
        }
        SessionStorage.IP.set(ip);
        SessionStorage.username.set(request.getRemoteUser());
        SessionStorage.userAgent.set(userAgentMapper.getUserAgent(request.getHeader("User-Agent")));
        SessionStorage.requestUrl.set(request.getRequestURI());

        return true;
    }
}
