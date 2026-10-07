package org.nzbhydra.web;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebSocketAuthorizationInterceptorTest {

    @Mock
    private ConfigProvider configProvider;

    @InjectMocks
    private WebSocketAuthorizationInterceptor testee;

    private final BaseConfig baseConfig = new BaseConfig();
    private final MessageChannel channel = mock(MessageChannel.class);

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getAuth().setAuthType(AuthType.FORM);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldRefuseDownloaderStatusForAnonymousSessionWhenEverythingIsRestricted() {
        Authentication anonymous = new AnonymousAuthenticationToken("key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));

        assertThat(testee.preSend(subscribe("/topic/downloaderStatus", anonymous), channel)).isNull();
        assertThat(testee.preSend(send("/app/connectDownloaderStatus", anonymous), channel)).isNull();
        assertThat(testee.preSend(subscribe("/topic/searchState", anonymous), channel)).isNull();
        assertThat(testee.preSend(subscribe("/topic/notifications", anonymous), channel)).isNull();
    }

    @Test
    void shouldAllowDownloaderStatusForAnonymousSessionWhenSearchIsUnrestricted() {
        Authentication anonymous = new AnonymousAuthenticationToken("key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_USER", "ROLE_ANONYMOUS"));

        assertThat(testee.preSend(subscribe("/topic/downloaderStatus", anonymous), channel)).isNotNull();
        assertThat(testee.preSend(subscribe("/topic/notifications", anonymous), channel)).isNull();
    }

    @Test
    void shouldAllowNotificationsOnlyForAdmins() {
        Authentication user = new UsernamePasswordAuthenticationToken("user", null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        Authentication admin = new UsernamePasswordAuthenticationToken("admin", null, AuthorityUtils.createAuthorityList("ROLE_USER", "ROLE_ADMIN"));

        assertThat(testee.preSend(subscribe("/topic/notifications", user), channel)).isNull();
        assertThat(testee.preSend(send("/app/markNotificationRead", user), channel)).isNull();
        assertThat(testee.preSend(subscribe("/topic/notifications", admin), channel)).isNotNull();
        assertThat(testee.preSend(send("/app/markNotificationRead", admin), channel)).isNotNull();
    }

    @Test
    void shouldRefuseUnknownDestinationsAndSessionsWithoutAuthentication() {
        Authentication admin = new UsernamePasswordAuthenticationToken("admin", null, AuthorityUtils.createAuthorityList("ROLE_USER", "ROLE_ADMIN"));

        assertThat(testee.preSend(subscribe("/topic/somethingElse", admin), channel)).isNull();
        assertThat(testee.preSend(subscribe("/topic/downloaderStatus", null), channel)).isNull();
    }

    @Test
    void shouldAllowEverythingWithoutAuthConfigured() {
        baseConfig.getAuth().setAuthType(AuthType.NONE);

        assertThat(testee.preSend(subscribe("/topic/downloaderStatus", null), channel)).isNotNull();
        assertThat(testee.preSend(subscribe("/topic/notifications", null), channel)).isNotNull();
    }

    @Test
    void shouldPassFramesOtherThanSubscribeAndSend() {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(SimpMessageType.CONNECT);
        accessor.setSessionAttributes(new HashMap<>());
        Message<byte[]> connect = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThat(testee.preSend(connect, channel)).isSameAs(connect);
    }

    @Test
    void shouldRememberHandshakeAuthentication() {
        Authentication user = new UsernamePasswordAuthenticationToken("user", null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        SecurityContextHolder.getContext().setAuthentication(user);
        Map<String, Object> attributes = new HashMap<>();

        assertThat(testee.beforeHandshake(null, null, null, attributes)).isTrue();

        assertThat(attributes.get(WebSocketAuthorizationInterceptor.AUTHENTICATION_ATTRIBUTE)).isSameAs(user);
    }

    private static Message<byte[]> subscribe(String destination, Authentication authentication) {
        return message(SimpMessageType.SUBSCRIBE, destination, authentication);
    }

    private static Message<byte[]> send(String destination, Authentication authentication) {
        return message(SimpMessageType.MESSAGE, destination, authentication);
    }

    private static Message<byte[]> message(SimpMessageType type, String destination, Authentication authentication) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(type);
        accessor.setDestination(destination);
        Map<String, Object> attributes = new HashMap<>();
        if (authentication != null) {
            attributes.put(WebSocketAuthorizationInterceptor.AUTHENTICATION_ATTRIBUTE, authentication);
        }
        accessor.setSessionAttributes(attributes);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
