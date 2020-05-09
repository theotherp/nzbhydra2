/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class ForwardedForRecognizingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ForwardedForRecognizingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String ipToUse;
        String header = request.getHeader("X-Forwarded-For");
        if (header != null) {
            ipToUse = header;
        } else {
            ipToUse = request.getRemoteAddr();
        }
        SessionStorage.originalIp.set(request.getRemoteAddr());
        HttpServletRequestWrapper requestWrapper = new HttpServletRequestWrapper(request) {
            @Override
            public String getRemoteAddr() {
                return ipToUse;
            }
        };

        filterChain.doFilter(requestWrapper, response);
    }
}
