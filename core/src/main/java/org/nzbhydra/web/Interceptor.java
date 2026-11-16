package org.nzbhydra.web;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Strings;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
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
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;

@Component
public class Interceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(Interceptor.class);
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UserAgentMapper userAgentMapper;

    private static final List<String> API_KEY_PATHS = List.of("/api", "/rss", "/torznab/api", "/getnzb/api", "/gettorrent/api");

    /**
     * Maximum time a request waits for the reverse DNS lookup of its IP, counted from the start of the lookup. Requests
     * arriving while a lookup for their IP is running share it and wait only for what is left of this time.
     */
    private static final long HOST_LOOKUP_TIMEOUT_MILLIS = 500;
    private static final long HOST_FOUND_TTL_MINUTES = 60;
    private static final long HOST_NOT_FOUND_TTL_MINUTES = 10;
    /**
     * How long a lookup that did not finish within {@link #HOST_LOOKUP_TIMEOUT_MILLIS} (or could not be queued) keeps
     * requests for that IP from starting a new one. Replaced by the real outcome if the lookup finishes later.
     */
    private static final long HOST_LOOKUP_TIMED_OUT_TTL_MINUTES = 2;
    private static final int HOST_LOOKUP_CACHE_SIZE = 500;
    private static final int HOST_LOOKUP_THREADS = 2;
    private static final int HOST_LOOKUP_QUEUE_SIZE = 50;

    private final ExpiringMap<String, HostLookup> hostLookups = ExpiringMap.builder()
            .maxSize(HOST_LOOKUP_CACHE_SIZE)
            .variableExpiration()
            .build();

    private final ThreadPoolExecutor hostLookupExecutor = new ThreadPoolExecutor(HOST_LOOKUP_THREADS, HOST_LOOKUP_THREADS,
            30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(HOST_LOOKUP_QUEUE_SIZE),
            new ThreadFactoryBuilder().setDaemon(true).setNameFormat("HostLookup-%d").build(),
            new ThreadPoolExecutor.AbortPolicy());

    @VisibleForTesting
    Function<String, Optional<String>> hostNameLookup = Interceptor::lookUpHostName;

    public Interceptor() {
        hostLookupExecutor.allowCoreThreadTimeOut(true);
    }

    @PreDestroy
    public void shutdownHostLookupExecutor() {
        hostLookupExecutor.shutdownNow();
    }

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
        HostLookup lookup = getOrStartHostLookup(ip);
        long remainingNanos = lookup.startedAtNanos + TimeUnit.MILLISECONDS.toNanos(HOST_LOOKUP_TIMEOUT_MILLIS) - System.nanoTime();
        try {
            if (lookup.result.isDone() || remainingNanos > 0) {
                return lookup.result.get(Math.max(remainingNanos, 0), TimeUnit.NANOSECONDS);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException | TimeoutException ignored) {
            //Fall through to using the IP
        }
        logger.debug("Cancelling mapping of IP to host after timeout");
        return Optional.empty();
    }

    private HostLookup getOrStartHostLookup(String ip) {
        HostLookup lookup;
        synchronized (hostLookups) {
            lookup = hostLookups.get(ip);
            if (lookup != null) {
                return lookup;
            }
            lookup = new HostLookup(new CompletableFuture<>(), System.nanoTime());
            hostLookups.put(ip, lookup, ExpirationPolicy.CREATED, HOST_LOOKUP_TIMED_OUT_TTL_MINUTES, TimeUnit.MINUTES);
        }
        HostLookup startedLookup = lookup;
        try {
            hostLookupExecutor.execute(() -> {
                Optional<String> host;
                try {
                    host = hostNameLookup.apply(ip);
                } catch (Exception e) {
                    logger.debug("Error mapping IP {} to host", ip, e);
                    host = Optional.empty();
                }
                cacheHostLookupOutcome(ip, startedLookup, host);
                startedLookup.result.complete(host);
            });
        } catch (RejectedExecutionException e) {
            //Too many lookups queued (e.g. a slow DNS server). Keep the entry with the short expiry so requests from this IP don't retry right away.
            logger.debug("Not mapping IP {} to host because too many lookups are pending", ip);
            startedLookup.result.complete(Optional.empty());
        }
        return startedLookup;
    }

    private void cacheHostLookupOutcome(String ip, HostLookup lookup, Optional<String> host) {
        synchronized (hostLookups) {
            //Don't overwrite a newer lookup if this entry expired or was evicted in the meantime
            if (hostLookups.get(ip) == lookup) {
                long ttlMinutes = host.isPresent() ? HOST_FOUND_TTL_MINUTES : HOST_NOT_FOUND_TTL_MINUTES;
                hostLookups.setExpiration(ip, ttlMinutes, TimeUnit.MINUTES);
            }
        }
    }

    private static Optional<String> lookUpHostName(String ip) {
        try {
            return Optional.ofNullable(InetAddress.getByName(ip).getHostName());
        } catch (UnknownHostException e) {
            return Optional.empty();
        }
    }

    private record HostLookup(CompletableFuture<Optional<String>> result, long startedAtNanos) {
    }
}
