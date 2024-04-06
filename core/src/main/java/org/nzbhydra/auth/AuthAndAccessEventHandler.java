package org.nzbhydra.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.notifications.AuthFailureNotificationEvent;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.io.IOException;

@Controller
public class AuthAndAccessEventHandler extends AccessDeniedHandlerImpl {

    private static final Logger logger = LoggerFactory.getLogger(AuthAndAccessEventHandler.class);

    @Autowired
    private LoginAndAccessAttemptService attemptService;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    @EventListener
    public void onApplicationEvent(AuthenticationFailureBadCredentialsEvent event) {
        Object userName = event.getAuthentication().getPrincipal();
        String ip = SessionStorage.IP.get();
        if (ip == null) { //Might not always be set
            ip = ((HydraWebAuthenticationDetails) event.getAuthentication().getDetails()).getFilteredIp();
            SessionStorage.IP.set(ip);
        }
        logger.warn("Failed login with username {} from IP {}", userName, SessionStorage.IP.get());
        attemptService.accessFailed(SessionStorage.IP.get());
        applicationEventPublisher.publishEvent(new AuthFailureNotificationEvent(ip, userName.toString()));
    }

    @EventListener
    public void onApplicationEvent(AuthenticationSuccessEvent event) {
        String ip = SessionStorage.IP.get();
        if (ip == null) { //Might not always be set
            if (event.getAuthentication().getDetails() instanceof HydraWebAuthenticationDetails) {
                //In rare cases the details were not set properly, e.g. when the user enables auth and then opens the page in the same session
                ip = ((HydraWebAuthenticationDetails) event.getAuthentication().getDetails()).getFilteredIp();
                SessionStorage.IP.set(ip);
            }
        }
        if (attemptService.wasUnsuccessfulBefore(SessionStorage.IP.get())) {
            User user;
            try {
                user = (User) event.getAuthentication().getPrincipal();
                logger.info("Successful login with username {} from IP {}. Removing previous unsuccessful events from block log", user.getUsername(), SessionStorage.IP.get());
            } catch (ClassCastException e) {
                logger.info("Successful login from IP {}. Removing previous unsuccessful events from block log", SessionStorage.IP.get());
            }
        }
        attemptService.accessSucceeded(SessionStorage.IP.get());
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException, ServletException {
        logger.warn("Access denied to IP {}: {}. Request path: {}. Parameters: {}", SessionStorage.IP.get(), accessDeniedException.getMessage(), request.getContextPath(), request.getParameterMap());
        attemptService.accessFailed(SessionStorage.IP.get());
        super.handle(request, response, accessDeniedException);
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @RequestMapping("unauthorised")
    public String unAuthorised(HttpServletRequest request) {
        return "hallo";
    }
}
