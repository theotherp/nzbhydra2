package org.nzbhydra.auth;

import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Controller
public class AuthAndAccessEventHandler implements AccessDeniedHandler {

    private static final Logger logger = LoggerFactory.getLogger(AuthAndAccessEventHandler.class);

    @Autowired
    private LoginAndAccessAttemptService attemptService;

    @EventListener
    public void onApplicationEvent(AuthenticationFailureBadCredentialsEvent event) {
        Object userName = event.getAuthentication().getPrincipal();
        logger.warn("Failed login with username {} from IP {}", userName, SessionStorage.IP.get());
        attemptService.accessFailed(SessionStorage.IP.get());
    }

    @EventListener
    public void onApplicationEvent(AuthenticationSuccessEvent event) {
        if (attemptService.wasUnsuccessfulBefore(SessionStorage.IP.get())) {
            User user;
            try {
                user = (User) event.getAuthentication().getPrincipal();
                logger.info("Successful login with username {} from IP {}. Removing previous unsuccessful events from block log", user.getUsername(), SessionStorage.IP.get());
            } catch (ClassCastException e) {
                logger.info("Successful login from IP {}. Removing previous unsuccessful events from block log",SessionStorage.IP.get());
            }
        }
        attemptService.accessSucceeded(SessionStorage.IP.get());
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException, ServletException {
        logger.warn("Access denied to IP {}: {}", SessionStorage.IP.get(), accessDeniedException.toString());
        attemptService.accessFailed(SessionStorage.IP.get());
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @RequestMapping("unauthorised")
    public String unAuthorised(HttpServletRequest request) throws Exception {
        return "hallo";
    }
}
