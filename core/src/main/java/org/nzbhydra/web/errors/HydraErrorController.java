/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.web.errors;

import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.Jackson;
import org.nzbhydra.misc.StackTraceFilter;
import org.springframework.boot.autoconfigure.web.servlet.error.AbstractErrorController;
import org.springframework.boot.web.servlet.error.DefaultErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Controller
@Slf4j
public class HydraErrorController extends AbstractErrorController implements ErrorController {

    public HydraErrorController(ErrorAttributes errorAttributes) {
        super(errorAttributes);
    }

    @RequestMapping("/error")
    public ResponseEntity<Object> handleError(HttpServletRequest request, HttpServletResponse response, Object handler) {
        WebRequest webRequest = new ServletWebRequest(request);
        Throwable ex = new DefaultErrorAttributes().getError(webRequest);
        Map<String, Object> map = new HashMap<>();
        HttpStatus status = getStatus(request);
        map.put("exception", StackTraceFilter.getFilteredStackTrace(ex));
        map.put("error", ex.getMessage());
        map.put("timestap", Instant.now());
        try {
            map.put("parameters", Jackson.JSON_MAPPER.writeValueAsString(request.getParameterMap()));
        } catch (JsonProcessingException e) {
            log.error("Error serializing parameters", e);
        }

        return ResponseEntity.status(status).body(map);
    }
}
