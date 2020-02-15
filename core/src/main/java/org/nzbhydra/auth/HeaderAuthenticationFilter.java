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

import com.google.common.net.InetAddresses;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class HeaderAuthenticationFilter extends BasicAuthenticationFilter {

    private static final Logger logger = LoggerFactory.getLogger(HeaderAuthenticationFilter.class);

    private HydraUserDetailsManager userDetailsManager;
    private AuthConfig authConfig;

    public HeaderAuthenticationFilter(AuthenticationManager authenticationManager, HydraUserDetailsManager userDetailsManager, AuthConfig authConfig) {
        super(authenticationManager);
        this.userDetailsManager = userDetailsManager;
        this.authConfig = authConfig;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        if (authConfig.getAuthHeader() == null || authConfig.getAuthHeaderIpRanges().isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader(authConfig.getAuthHeader());
        if (header == null) {
            chain.doFilter(request, response);
            return;
        }

        String ip = SessionStorage.originalIp.get();
        long ipAsLong = HydraOkHttp3ClientHttpRequestFactory.ipToLong(InetAddresses.forString(ip));
        boolean isInSecureRange = authConfig.getAuthHeaderIpRanges().stream().anyMatch(x -> {
            if (!x.contains("-")) {
                return x.equals(ip);
            }
            String[] split = x.split("-");
            long ipLow = HydraOkHttp3ClientHttpRequestFactory.ipToLong(InetAddresses.forString(split[0]));
            long ipHigh = HydraOkHttp3ClientHttpRequestFactory.ipToLong(InetAddresses.forString(split[1]));
            return ipLow <= ipAsLong && ipAsLong <= ipHigh;
        });

        if (!isInSecureRange) {
            handleInvalidAuth(request, response, "Auth header sent in request from insecure IP " + ip);
            return;
        }

        String username = header.trim();
        try {
            UserDetails userDetails = userDetailsManager.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new HydraWebAuthenticationDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
            onSuccessfulAuthentication(request, response, auth);
        } catch (UsernameNotFoundException e) {
            handleInvalidAuth(request, response, "Invalid username provided with auth header");
            return;
        }
        chain.doFilter(request, response);
    }

    public void loadNewConfig(AuthConfig authConfig) {
        this.authConfig = authConfig;
    }

    private void handleInvalidAuth(HttpServletRequest request, HttpServletResponse response, String msg) throws IOException {
        SecurityContextHolder.clearContext();
        BadCredentialsException badCredentialsException = new BadCredentialsException(msg);
        onUnsuccessfulAuthentication(request, response, badCredentialsException);
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, msg);
        logger.warn(msg);
    }
}
