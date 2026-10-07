package org.nzbhydra.auth;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.web.ClientIpResolver;
import org.nzbhydra.web.SessionStorage;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class ForwardedForRecognizingFilterTest {

    private final ForwardedForRecognizingFilter testee = new ForwardedForRecognizingFilter();
    private LoginAndAccessAttemptService attemptService;
    private AuthAndAccessEventHandler authAndAccessEventHandler;
    private HydraUserDetailsManager userDetailsManager;

    @BeforeEach
    void setUp() {
        attemptService = new LoginAndAccessAttemptService();
        authAndAccessEventHandler = new AuthAndAccessEventHandler();
        ReflectionTestUtils.setField(authAndAccessEventHandler, "attemptService", attemptService);
        ReflectionTestUtils.setField(authAndAccessEventHandler, "applicationEventPublisher", mock(ApplicationEventPublisher.class));
        userDetailsManager = new HydraUserDetailsManager(new BaseConfig());
        ReflectionTestUtils.setField(userDetailsManager, "attemptService", attemptService);
        clearSessionStorage();
    }

    @AfterEach
    void tearDown() {
        clearSessionStorage();
    }

    private static void clearSessionStorage() {
        SessionStorage.IP.remove();
        SessionStorage.originalIp.remove();
        SessionStorage.clientIp.remove();
    }

    private static MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login");
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    private void failLogin(MockHttpServletRequest request) throws Exception {
        FilterChain chain = (req, res) -> authAndAccessEventHandler.onApplicationEvent(new AuthenticationFailureBadCredentialsEvent(
                new UsernamePasswordAuthenticationToken("admin", "wrong"), new BadCredentialsException("Bad credentials")));
        testee.doFilter(request, new MockHttpServletResponse(), chain);
    }

    @Test
    void shouldNotAllowRotatingLockoutKeyViaForwardedForFromPublicPeer() throws Exception {
        for (int i = 0; i < 5; i++) {
            failLogin(request("203.0.113.7", "198.51.100." + i));
        }

        FilterChain loginAttempt = (req, res) -> userDetailsManager.loadUserByUsername("admin");
        assertThatThrownBy(() -> testee.doFilter(request("203.0.113.7", "198.51.100.99"), new MockHttpServletResponse(), loginAttempt))
                .hasMessageContaining("203.0.113.7 is currently blocked");
        assertThat(attemptService.isBlocked("203.0.113.7")).isTrue();
    }

    @Test
    void shouldNotAllowLockingOutVictimViaForwardedFor() throws Exception {
        for (int i = 0; i < 5; i++) {
            failLogin(request("203.0.113.7", "198.51.100.1"));
        }

        assertThat(attemptService.isBlocked("198.51.100.1")).isFalse();
        AtomicReference<String> clientIpDuringAuth = new AtomicReference<>();
        testee.doFilter(request("198.51.100.1", null), new MockHttpServletResponse(), (req, res) -> {
            clientIpDuringAuth.set(SessionStorage.clientIp.get());
        });
        assertThat(clientIpDuringAuth.get()).isEqualTo("198.51.100.1");
        assertThat(attemptService.isBlocked(clientIpDuringAuth.get())).isFalse();
    }

    @Test
    void shouldKeepClientsBehindTrustedProxyApart() throws Exception {
        for (int i = 0; i < 5; i++) {
            failLogin(request("127.0.0.1", "203.0.113.7"));
        }

        assertThat(attemptService.isBlocked("203.0.113.7")).isTrue();
        assertThat(attemptService.isBlocked("203.0.113.8")).isFalse();
        assertThat(attemptService.isBlocked("127.0.0.1")).isFalse();
    }

    @Test
    void shouldSetValuesForRequestAndClearThemAfterwards() throws Exception {
        SessionStorage.clientIp.set("leftover");
        SessionStorage.IP.set("leftover");
        AtomicReference<String> clientIp = new AtomicReference<>();
        AtomicReference<String> ip = new AtomicReference<>();
        AtomicReference<String> originalIp = new AtomicReference<>();
        MockHttpServletRequest request = request("10.0.0.2", "198.51.100.1, 203.0.113.7");

        testee.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            clientIp.set(SessionStorage.clientIp.get());
            ip.set(SessionStorage.IP.get());
            originalIp.set(SessionStorage.originalIp.get());
        });

        assertThat(clientIp.get()).isEqualTo("203.0.113.7");
        assertThat(ip.get()).isEqualTo("203.0.113.7");
        assertThat(originalIp.get()).isEqualTo("10.0.0.2");
        assertThat(request.getAttribute(ClientIpResolver.CLIENT_IP_ATTRIBUTE)).isEqualTo("203.0.113.7");
        assertThat(SessionStorage.clientIp.get()).isNull();
        assertThat(SessionStorage.IP.get()).isNull();
        assertThat(SessionStorage.originalIp.get()).isNull();
    }
}
