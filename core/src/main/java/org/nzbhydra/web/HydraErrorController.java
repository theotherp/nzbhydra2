/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.nzbhydra.misc.StackTraceFilter;
import org.springframework.boot.autoconfigure.web.servlet.error.AbstractErrorController;
import org.springframework.boot.web.servlet.error.DefaultErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.ModelAndView;

import java.time.Instant;

@Controller
@Log4j2
public class HydraErrorController extends AbstractErrorController implements ErrorController {
    public HydraErrorController(ErrorAttributes errorAttributes) {
        super(errorAttributes);
    }

    @RequestMapping("/error")
    public ModelAndView handleError(HttpServletRequest request, HttpServletResponse response, Object handler) {
        ModelAndView errorPage = new ModelAndView("error");
        WebRequest webRequest = new ServletWebRequest(request);
        Throwable ex = new DefaultErrorAttributes().getError(webRequest);
        if (ex != null) {
            errorPage.addObject("exception", StackTraceFilter.getFilteredStackTrace(ex));
            errorPage.addObject("error", ex.getMessage());
            //Log for good measure, perhaps it wasn't already logged
            log.debug("Handling exception", ex);
        } else {
            log.error("Cannot show filtered exception because it's null");
        }

        errorPage.addObject("status", response.getStatus());
        errorPage.addObject("timestamp", Instant.now().toString());
        return errorPage;
    }
}
