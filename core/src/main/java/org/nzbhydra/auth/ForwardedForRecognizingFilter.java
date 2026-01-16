

package org.nzbhydra.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class ForwardedForRecognizingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ForwardedForRecognizingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        SessionStorage.originalIp.set(request.getRemoteAddr());
        filterChain.doFilter(request, response);
    }
}
