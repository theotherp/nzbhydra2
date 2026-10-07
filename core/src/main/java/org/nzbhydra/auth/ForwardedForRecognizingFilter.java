package org.nzbhydra.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.web.ClientIpResolver;
import org.nzbhydra.web.SessionStorage;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs before the security context filter and therefore before any authentication. Records the TCP peer address
 * and the client IP (see {@link ClientIpResolver}) of the current request before the {@code ForwardedHeaderFilter}
 * replaces {@code getRemoteAddr()} with the client-controlled first {@code X-Forwarded-For} entry. The client IP is
 * the key for blocking repeated failed logins, so it must be set for every request and never be left over from a
 * previous request handled by the same thread.
 */
public class ForwardedForRecognizingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String clientIp = ClientIpResolver.resolveFromHeaders(request);
        request.setAttribute(ClientIpResolver.CLIENT_IP_ATTRIBUTE, clientIp);
        SessionStorage.originalIp.set(request.getRemoteAddr());
        SessionStorage.clientIp.set(clientIp);
        //Overwritten by the Interceptor (which may map it to a host name) for requests reaching a controller
        SessionStorage.IP.set(clientIp);
        try {
            filterChain.doFilter(request, response);
        } finally {
            SessionStorage.originalIp.remove();
            SessionStorage.clientIp.remove();
            SessionStorage.IP.remove();
        }
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        //Async and error dispatches run outside the original filter invocation, possibly on another thread
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }
}
