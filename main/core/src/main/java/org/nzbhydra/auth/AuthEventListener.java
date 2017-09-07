package org.nzbhydra.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AbstractAuthenticationFailureEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;

@Component
public class AuthEventListener {

    private static final Logger logger = LoggerFactory.getLogger(AuthEventListener.class);

    @EventListener
    public void handle(AuthenticationSuccessEvent event) {
        try {
            User user = (User) event.getAuthentication().getPrincipal();
            logger.info("User {} successfully logged in", user.getUsername());
        } catch (ClassCastException e) {
            logger.error("Unable to get principal from auth event", e);
        }

    }

    @EventListener
    public void handle(AbstractAuthenticationFailureEvent event) {
        logger.warn(event.toString());
    }
}
