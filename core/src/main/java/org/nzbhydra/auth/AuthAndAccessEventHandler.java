package org.nzbhydra.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.notifications.AuthFailureNotificationEvent;
import org.nzbhydra.web.ClientIpResolver;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationTrustResolver;
import org.springframework.security.authentication.AuthenticationTrustResolverImpl;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final AuthenticationTrustResolver trustResolver = new AuthenticationTrustResolverImpl();

    @EventListener
    public void onApplicationEvent(AuthenticationFailureBadCredentialsEvent event) {
        Object userName = event.getAuthentication().getPrincipal();
        String ip = getClientIp(event.getAuthentication().getDetails());
        logger.warn("Failed login with username {} from IP {}", userName, ip);
        attemptService.accessFailed(ip);
        applicationEventPublisher.publishEvent(new AuthFailureNotificationEvent(ip, userName.toString()));
    }

    @EventListener
    public void onApplicationEvent(AuthenticationSuccessEvent event) {
        String ip = getClientIp(event.getAuthentication().getDetails());
        if (attemptService.wasUnsuccessfulBefore(ip)) {
            User user;
            try {
                user = (User) event.getAuthentication().getPrincipal();
                logger.info("Successful login with username {} from IP {}. Removing previous unsuccessful events from block log", user.getUsername(), ip);
            } catch (ClassCastException e) {
                logger.info("Successful login from IP {}. Removing previous unsuccessful events from block log", ip);
            }
        }
        attemptService.accessSucceeded(ip);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException, ServletException {
        String ip = SessionStorage.clientIp.get();
        if (ip == null) {
            ip = ClientIpResolver.resolve(request);
        }
        logger.warn("Access denied to IP {}: {}. Request path: {}. Parameters: {}", ip, accessDeniedException.getMessage(), request.getContextPath(), request.getParameterMap());
        if (isUnauthenticated(SecurityContextHolder.getContext().getAuthentication())) {
            //A logged-in user opening a page their role doesn't allow (or whose CSRF token expired) is not guessing
            //credentials and must not be locked out at their next login
            attemptService.accessFailed(ip);
        }
        super.handle(request, response, accessDeniedException);
    }

    private boolean isUnauthenticated(Authentication authentication) {
        return authentication == null || !authentication.isAuthenticated() || trustResolver.isAnonymous(authentication);
    }

    /**
     * The key for blocking failed logins. Uses the client IP resolved for the current request by the
     * {@link ForwardedForRecognizingFilter} (never a host name and never one supplied unchecked by the client). The
     * details recorded with the authentication are only a fallback for when the filter did not run.
     */
    private String getClientIp(Object authenticationDetails) {
        String ip = SessionStorage.clientIp.get();
        if (ip == null && authenticationDetails instanceof HydraWebAuthenticationDetails details) {
            ip = details.getFilteredIp();
        }
        return ip;
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @PublicEndpoint(reason = "Answers 401 for unauthorised requests")
    @RequestMapping("unauthorised")
    public String unAuthorised(HttpServletRequest request) throws Exception {
        return "hallo";
    }
}
