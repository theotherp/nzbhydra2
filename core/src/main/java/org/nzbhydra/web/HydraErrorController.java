

package org.nzbhydra.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.misc.StackTraceFilter;
import org.springframework.boot.autoconfigure.web.servlet.error.AbstractErrorController;
import org.springframework.boot.web.servlet.error.ErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

import java.time.Instant;

@Controller
public class HydraErrorController extends AbstractErrorController implements ErrorController {
    public HydraErrorController(ErrorAttributes errorAttributes) {
        super(errorAttributes);
    }

    @RequestMapping("/error")
    public ModelAndView handleError(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        //do something like logging
        ModelAndView errorPage = new ModelAndView("error");
        errorPage.addObject("exception", StackTraceFilter.getFilteredStackTrace(ex));
        errorPage.addObject("error", ex.getMessage());
        errorPage.addObject("status", response.getStatus());
        errorPage.addObject("timestamp", Instant.now().toString());
        return errorPage;
    }
}
