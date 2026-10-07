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
import java.util.List;
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

    private static final List<String> API_KEY_PATHS = List.of("/api", "/rss", "/torznab/api", "/getnzb/api", "/gettorrent/api");

    private final Set<String> skipHostnameMappingFor = new HashSet<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        //Reset because this thread may have been reused. Most will be overwritten below but perhaps not all, e.g. username.
        SessionStorage.username.remove();
        //originalIp and clientIp are set (and cleared) per request by the ForwardedForRecognizingFilter
        SessionStorage.IP.remove();
        SessionStorage.userAgent.remove();
        SessionStorage.requestUrl.remove();
        SessionStorage.outputType.remove();

        //Forwarding headers are only trusted when sent by a proxy in the local network, see ClientIpResolver
        String ip = ClientIpResolver.resolve(request);
        if (configProvider.getBaseConfig().getMain().getLogging().isMapIpToHost()) {
            ip = getHostFromIp(ip).orElse(ip);
        }
        if (configProvider.getBaseConfig().getMain().getLogging().isLogIpAddresses()) {
            MDC.put("IPADDRESS", ip);
        }

        SessionStorage.IP.set(ip);

        if (request.getRemoteUser() != null) {
            SessionStorage.username.set(request.getRemoteUser());
        } else if (request.getParameter("username") != null && isApiKeyAuthenticatedPath(request)) {
            //Only for external tools (downloaders using links built by DownloadUrlBuilder, API clients) so that history entries can be attributed.
            //This is unauthenticated metadata and must never be used for authorization decisions. Web/internal requests never take it from the parameter.
            SessionStorage.username.set(request.getParameter("username"));
        }
        if (configProvider.getBaseConfig().getMain().getLogging().isLogUsername()) {
            if (!Strings.isNullOrEmpty(SessionStorage.username.get())) {
                MDC.put("USERNAME", SessionStorage.username.get());
            }
        }
        SessionStorage.userAgent.set(userAgentMapper.getUserAgent(request.getHeader("User-Agent")));
        SessionStorage.requestUrl.set(request.getRequestURI());

        return true;
    }

    static boolean isApiKeyAuthenticatedPath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        if (requestUri == null) {
            return false;
        }
        String path = requestUri;
        String contextPath = request.getContextPath();
        if (!Strings.isNullOrEmpty(contextPath) && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        final String relativePath = path;
        return API_KEY_PATHS.stream().anyMatch(prefix -> relativePath.equals(prefix) || relativePath.startsWith(prefix + "/"));
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
