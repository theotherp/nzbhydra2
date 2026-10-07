package org.nzbhydra.web;

import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Authorizes STOMP frames on the websocket. The HTTP security chain lets anonymous sessions open {@code /websocket}
 * (they need it when an area is unrestricted), so without this every topic was readable by anyone who could reach
 * the page, including the login page with every area restricted.
 *
 * <p>The authentication of the handshake request is remembered in the websocket session attributes because
 * Spring only hands a non-anonymous principal to the STOMP session. Every SUBSCRIBE and SEND is then checked against
 * {@link #REQUIRED_ROLES}; destinations not listed there are refused. Refused frames are dropped, so the client
 * neither gets the data nor triggers the subscription's scheduled work.
 */
@Component
public class WebSocketAuthorizationInterceptor implements ChannelInterceptor, HandshakeInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthorizationInterceptor.class);
    static final String AUTHENTICATION_ATTRIBUTE = WebSocketAuthorizationInterceptor.class.getName() + ".authentication";

    /**
     * The role a session needs per destination, matching the REST endpoints and the UI that consumes them: the
     * downloader status and search progress belong to searching, the notifications to the admin area.
     */
    static final Map<String, String> REQUIRED_ROLES = Map.of(
            "/topic/downloaderStatus", "ROLE_USER",
            "/app/connectDownloaderStatus", "ROLE_USER",
            "/topic/searchState", "ROLE_USER",
            "/topic/notifications", "ROLE_ADMIN",
            "/app/markNotificationRead", "ROLE_ADMIN"
    );

    @Autowired
    private ConfigProvider configProvider;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            attributes.put(AUTHENTICATION_ATTRIBUTE, authentication);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
        //Nothing to do
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        SimpMessageType messageType = SimpMessageHeaderAccessor.getMessageType(message.getHeaders());
        if (messageType != SimpMessageType.SUBSCRIBE && messageType != SimpMessageType.MESSAGE) {
            return message;
        }
        if (!configProvider.getBaseConfig().getAuth().isAuthConfigured()) {
            return message;
        }
        String destination = SimpMessageHeaderAccessor.getDestination(message.getHeaders());
        Map<String, Object> sessionAttributes = SimpMessageHeaderAccessor.getSessionAttributes(message.getHeaders());
        Authentication authentication = sessionAttributes == null ? null : (Authentication) sessionAttributes.get(AUTHENTICATION_ATTRIBUTE);
        if (isAllowed(destination, authentication)) {
            return message;
        }
        logger.debug("Refusing websocket {} to {} for {}", messageType, destination, authentication == null ? "unauthenticated session" : authentication.getName());
        return null;
    }

    static boolean isAllowed(String destination, Authentication authentication) {
        String requiredRole = destination == null ? null : REQUIRED_ROLES.get(destination);
        if (requiredRole == null || authentication == null) {
            return false;
        }
        Set<String> roles = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
        return roles.contains(requiredRole);
    }
}
