package org.nzbhydra.web;

import com.google.common.base.Strings;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.misc.UserAgentMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@Component
public class Interceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(Interceptor.class);
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UserAgentMapper userAgentMapper;

    private final Set<String> skipHostnameMappingFor = new HashSet<>();


    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip != null) {
            ip = ip.split(",")[0];
        } else {
            ip = request.getRemoteAddr();
        }
        if (configProvider.getBaseConfig().getMain().getLogging().isMapIpToHost()) {
            ip = getHostFromIp(ip).orElse(ip);
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

    private Optional<String> getHostFromIp(String ip) {
        if (skipHostnameMappingFor.contains(ip)) {
            return Optional.empty();
        }
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<String> future = executor.submit(() -> {
            try {
                InetAddress inetAddress = InetAddress.getByName(ip);
                return inetAddress.getHostName();
            } catch (UnknownHostException e) {
                skipHostnameMappingFor.add(ip);
                return null;
            }
        });

        try {
            return Optional.of(future.get(500, TimeUnit.MILLISECONDS));
        } catch (Exception ignored) {
            logger.debug("Cancelling mapping of IP to host after timeout");
            return Optional.empty();
        } finally {
            executor.shutdownNow();
        }
    }
}
