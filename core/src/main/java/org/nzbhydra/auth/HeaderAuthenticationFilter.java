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

import org.apache.commons.lang3.StringUtils;
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

    public HeaderAuthenticationFilter(AuthenticationManager authenticationManager, HydraUserDetailsManager userDetailsManager) {
        super(authenticationManager);
        this.userDetailsManager = userDetailsManager;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        String header = request.getHeader("X-Authorization");
        if (header == null) {
            header = request.getHeader("Authorization");
        }
        if (header == null) {
            chain.doFilter(request, response);
            return;
        }
        if (header.startsWith("Basic")) {
            chain.doFilter(request, response);
            return;
        }
        if (!header.startsWith("Bearer")) {
            logger.warn("X-Authorization header provided without leading \"Bearer\"");
            chain.doFilter(request, response);
            return;
        }
        String token = StringUtils.removeStart(header, "Bearer").trim();

        try {
            UserDetails userDetails = userDetailsManager.loadUserByToken(token);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new HydraWebAuthenticationDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
            onSuccessfulAuthentication(request, response, auth);
        } catch (UsernameNotFoundException e) {
            SecurityContextHolder.clearContext();
            String msg = "Invalid token supplied with (X-)Authorization header";
            BadCredentialsException badCredentialsException = new BadCredentialsException(msg);
            onUnsuccessfulAuthentication(request, response, badCredentialsException);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, msg);
            return;
        }
        chain.doFilter(request, response);

    }
}
