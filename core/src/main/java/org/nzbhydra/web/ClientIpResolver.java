package org.nzbhydra.web;

import com.google.common.base.Strings;
import com.google.common.net.InetAddresses;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.util.matcher.IpAddressMatcher;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.stream.Stream;

/**
 * Determines the IP address of the client that sent a request.
 * <p>
 * {@code X-Forwarded-For} and {@code X-Real-IP} can be set by anyone, so they are only trusted when the TCP peer is
 * itself a trusted proxy. Trusted proxies are the ranges in {@link #TRUSTED_PROXY_RANGES}: loopback, private,
 * link-local and carrier-grade NAT (also used by Tailscale). These are the ranges matched by the default
 * {@code internalProxies} pattern of Tomcat's {@code RemoteIpValve}.
 * There is no setting for this: a reverse proxy running on the same host or in the local network (the usual setup,
 * including docker) is trusted, a reverse proxy with a public address is not and all requests coming through it are
 * attributed to the proxy.
 * <p>
 * When the peer is trusted the {@code X-Forwarded-For} list is walked from right to left (every proxy appends the
 * address it received the request from), skipping entries that are trusted proxies themselves, and the first
 * untrusted address is taken. Entries left of that were supplied by the client and are ignored. If all entries are
 * trusted the leftmost one is taken. An entry that is not an IP address ends the walk and the closest address
 * verified so far is used.
 */
public final class ClientIpResolver {

    /**
     * Request attribute holding the IP resolved by {@link org.nzbhydra.auth.ForwardedForRecognizingFilter} so that
     * code running behind the {@code ForwardedHeaderFilter} (which rewrites {@code getRemoteAddr()} from the
     * client-controlled {@code X-Forwarded-For}) gets the same value.
     */
    public static final String CLIENT_IP_ATTRIBUTE = ClientIpResolver.class.getName() + ".clientIp";

    public static final String X_FORWARDED_FOR = "X-Forwarded-For";
    public static final String X_REAL_IP = "X-Real-IP";

    /**
     * Loopback, private and link-local ranges. Also used to decide whether a host is local for the outgoing proxy.
     */
    public static final List<IpAddressMatcher> PRIVATE_NETWORK_RANGES = List.of(
            // IPv4 local and private ranges
            new IpAddressMatcher("127.0.0.0/8"),     // Loopback (IPv4)
            new IpAddressMatcher("10.0.0.0/8"),      // Private (Class A)
            new IpAddressMatcher("172.16.0.0/12"),   // Private (Class B)
            new IpAddressMatcher("192.168.0.0/16"),  // Private (Class C)
            new IpAddressMatcher("169.254.0.0/16"),  // Link Local (IPv4)

            // IPv6 local and private ranges
            new IpAddressMatcher("::1/128"),         // Loopback (IPv6)
            new IpAddressMatcher("fc00::/7"),        // Unique Local IPv6
            new IpAddressMatcher("fe80::/10")        // Link Local IPv6
    );

    /**
     * Peers whose forwarding headers are trusted: {@link #PRIVATE_NETWORK_RANGES} plus the carrier-grade NAT range.
     * The latter is not part of the private ranges because it is not local to the host's network (it must not be
     * treated as local by the outgoing proxy settings), but reverse proxies reached via Tailscale connect from it.
     */
    public static final List<IpAddressMatcher> TRUSTED_PROXY_RANGES = Stream.concat(
            PRIVATE_NETWORK_RANGES.stream(),
            Stream.of(new IpAddressMatcher("100.64.0.0/10")) // Carrier-grade NAT, Tailscale
    ).toList();

    private ClientIpResolver() {
    }

    /**
     * Returns the client IP for the request, preferring the value already resolved for it by the filter.
     */
    public static String resolve(HttpServletRequest request) {
        Object resolved = request.getAttribute(CLIENT_IP_ATTRIBUTE);
        if (resolved instanceof String ip) {
            return ip;
        }
        return resolveFromHeaders(request);
    }

    /**
     * Resolves the client IP from the TCP peer address and the forwarding headers, ignoring any value resolved
     * earlier. Request wrappers (e.g. the one of {@code ForwardedHeaderFilter}) are skipped so that the real peer
     * address is used.
     */
    public static String resolveFromHeaders(HttpServletRequest request) {
        HttpServletRequest original = unwrap(request);
        List<String> forwardedFor = new ArrayList<>();
        Enumeration<String> headers = original.getHeaders(X_FORWARDED_FOR);
        if (headers != null) {
            forwardedFor.addAll(Collections.list(headers));
        }
        return resolve(original.getRemoteAddr(), forwardedFor, original.getHeader(X_REAL_IP));
    }

    /**
     * @param remoteAddr   the TCP peer address
     * @param forwardedFor the values of all {@code X-Forwarded-For} headers, in the order they were received
     * @param realIp       the value of the {@code X-Real-IP} header, may be null
     */
    public static String resolve(String remoteAddr, List<String> forwardedFor, String realIp) {
        if (Strings.isNullOrEmpty(remoteAddr) || !isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }
        List<String> entries = new ArrayList<>();
        if (forwardedFor != null) {
            for (String value : forwardedFor) {
                if (value == null) {
                    continue;
                }
                for (String entry : value.split(",")) {
                    if (!entry.isBlank()) {
                        entries.add(entry);
                    }
                }
            }
        }
        if (!entries.isEmpty()) {
            String closestVerified = remoteAddr;
            for (int i = entries.size() - 1; i >= 0; i--) {
                String address = normalize(entries.get(i));
                if (address == null) {
                    return closestVerified;
                }
                if (!isTrustedProxy(address)) {
                    return address;
                }
                closestVerified = address;
            }
            return closestVerified;
        }
        if (realIp != null) {
            String address = normalize(realIp);
            if (address != null) {
                return address;
            }
        }
        return remoteAddr;
    }

    /**
     * @return true if the address is in one of the {@link #TRUSTED_PROXY_RANGES}. False for anything that is not a
     * literal IP address (no DNS lookups are made).
     */
    public static boolean isTrustedProxy(String address) {
        String normalized = normalize(address);
        if (normalized == null) {
            return false;
        }
        String hostAddress = InetAddresses.forString(normalized).getHostAddress();
        return TRUSTED_PROXY_RANGES.stream().anyMatch(matcher -> matcher.matches(hostAddress));
    }

    /**
     * Strips whitespace, quotes, brackets, a port and an IPv6 zone from a header entry.
     *
     * @return the IP address or null if the entry is not a literal IP address
     */
    static String normalize(String entry) {
        if (entry == null) {
            return null;
        }
        String address = entry.trim();
        if (address.length() >= 2 && address.startsWith("\"") && address.endsWith("\"")) {
            address = address.substring(1, address.length() - 1).trim();
        }
        if (address.startsWith("[")) {
            int closing = address.indexOf(']');
            if (closing < 0) {
                return null;
            }
            address = address.substring(1, closing);
        } else if (address.indexOf(':') > 0 && address.indexOf(':') == address.lastIndexOf(':')) {
            //IPv4 with port. An IPv6 address always contains at least two colons
            address = address.substring(0, address.indexOf(':'));
        }
        int zoneIndex = address.indexOf('%');
        if (zoneIndex > 0) {
            address = address.substring(0, zoneIndex);
        }
        if (address.isEmpty() || !InetAddresses.isInetAddress(address)) {
            return null;
        }
        return address;
    }

    private static HttpServletRequest unwrap(HttpServletRequest request) {
        ServletRequest current = request;
        while (current instanceof ServletRequestWrapper wrapper && wrapper.getRequest() instanceof HttpServletRequest) {
            current = wrapper.getRequest();
        }
        return (HttpServletRequest) current;
    }
}
