package org.nzbhydra.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.web.SessionStorage;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AuthAndAccessEventHandlerTest {

    private static final String IP = "203.0.113.7";

    private AuthAndAccessEventHandler testee;
    private LoginAndAccessAttemptService attemptService;

    @BeforeEach
    void setUp() {
        attemptService = new LoginAndAccessAttemptService();
        testee = new AuthAndAccessEventHandler();
        ReflectionTestUtils.setField(testee, "attemptService", attemptService);
        ReflectionTestUtils.setField(testee, "applicationEventPublisher", mock(ApplicationEventPublisher.class));
        SessionStorage.clientIp.set(IP);
    }

    @AfterEach
    void tearDown() {
        SessionStorage.clientIp.remove();
        SecurityContextHolder.clearContext();
    }

    private void denyFiveTimes(Authentication authentication, AccessDeniedException exception) throws Exception {
        SecurityContextHolder.getContext().setAuthentication(authentication);
        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            testee.handle(new MockHttpServletRequest("GET", "/internalapi/config"), response, exception);
            assertThat(response.getStatus()).isEqualTo(403);
        }
    }

    private static Authentication loggedInUser() {
        return new UsernamePasswordAuthenticationToken("user", null, AuthorityUtils.createAuthorityList("ROLE_USER"));
    }

    @Test
    void shouldNotCountAccessDeniedForLoggedInUser() throws Exception {
        denyFiveTimes(loggedInUser(), new AccessDeniedException("Access denied"));

        assertThat(attemptService.wasUnsuccessfulBefore(IP)).isFalse();
        assertThat(attemptService.isBlocked(IP)).isFalse();
    }

    @Test
    void shouldNotCountCsrfFailureForLoggedInUser() throws Exception {
        denyFiveTimes(loggedInUser(), new InvalidCsrfTokenException(new DefaultCsrfToken("X-XSRF-TOKEN", "_csrf", "expected"), "actual"));

        assertThat(attemptService.isBlocked(IP)).isFalse();
    }

    @Test
    void shouldCountAccessDeniedForAnonymousUser() throws Exception {
        Authentication anonymous = new AnonymousAuthenticationToken("key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));

        denyFiveTimes(anonymous, new AccessDeniedException("Access denied"));

        assertThat(attemptService.isBlocked(IP)).isTrue();
    }

    @Test
    void shouldCountAccessDeniedWithoutAuthentication() throws Exception {
        denyFiveTimes(null, new AccessDeniedException("Access denied"));

        assertThat(attemptService.isBlocked(IP)).isTrue();
    }
}
