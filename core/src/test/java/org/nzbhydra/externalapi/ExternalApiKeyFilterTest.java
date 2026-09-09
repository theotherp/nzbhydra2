package org.nzbhydra.externalapi;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The whole authentication of {@code /externalapi/**}: the key is either right, and the request continues as an
 * admin, or the response is a bare 404 that gives nothing away.
 */
class ExternalApiKeyFilterTest {

    private static final String CONFIGURED_KEY = "the-api-key";

    private final BaseConfig baseConfig = new BaseConfig();
    private final ConfigProvider configProvider = mock(ConfigProvider.class);
    private final FilterChain chain = mock(FilterChain.class);
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        baseConfig.getMain().setApiKey(CONFIGURED_KEY);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldAuthenticateAsAdminWithTheKeyInTheHeader() throws Exception {
        MockHttpServletRequest request = request("/externalapi/v1/ping");
        request.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, CONFIGURED_KEY);

        filter(false).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.isAuthenticated()).isTrue();
        assertThat(authentication.getPrincipal()).isEqualTo(ExternalApiKeyFilter.PRINCIPAL);
        assertThat(authentication.getAuthorities()).extracting(GrantedAuthority::getAuthority).containsExactly("ROLE_ADMIN");
        assertThat(authentication.getDetails()).isNotNull();
    }

    /**
     * A browser session and a valid key can arrive on the same request. The context a session-backed request carries
     * is the very object the session holds, so setting the authentication on it would leave externalApi/ROLE_ADMIN
     * behind for every later request of that session - a privilege escalation for whoever was logged in there. The
     * filter installs a fresh context instead, which lives for this request only.
     */
    @Test
    void shouldNotWriteTheApiAuthenticationIntoAnExistingSession() throws Exception {
        Authentication sessionUser = UsernamePasswordAuthenticationToken.authenticated(
                "someuser", null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        SecurityContext sessionContext = SecurityContextHolder.createEmptyContext();
        sessionContext.setAuthentication(sessionUser);
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, sessionContext);
        MockHttpServletRequest request = request("/externalapi/v1/ping");
        request.setSession(session);
        request.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, CONFIGURED_KEY);
        //What SecurityContextHolderFilter has done by the time this filter runs
        SecurityContextHolder.setContext(sessionContext);

        filter(false).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        SecurityContext storedContext =
                (SecurityContext) session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertThat(storedContext).isSameAs(sessionContext);
        assertThat(storedContext.getAuthentication()).isSameAs(sessionUser);
        assertThat(SecurityContextHolder.getContext()).isNotSameAs(sessionContext);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .isEqualTo(ExternalApiKeyFilter.PRINCIPAL);
    }

    @Test
    void shouldAuthenticateWithTheKeyInTheQueryParameter() throws Exception {
        MockHttpServletRequest request = request("/externalapi/v1/ping");
        request.setParameter(ExternalApiKeyFilter.API_KEY_PARAMETER, CONFIGURED_KEY);

        filter(false).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    /**
     * A client that sends both must not be able to smuggle a wrong key past the check by putting the right one in the
     * other place, so exactly one of them is looked at.
     */
    @Test
    void shouldLetTheHeaderWinOverTheQueryParameter() throws Exception {
        MockHttpServletRequest wrongHeader = request("/externalapi/v1/ping");
        wrongHeader.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, "wrong");
        wrongHeader.setParameter(ExternalApiKeyFilter.API_KEY_PARAMETER, CONFIGURED_KEY);

        filter(false).doFilter(wrongHeader, response, chain);

        verify(chain, never()).doFilter(wrongHeader, response);
        assertThat(response.getStatus()).isEqualTo(404);
    }

    @Test
    void shouldAnswerWithAnEmptyNotFoundWhenNoKeyIsSent() throws Exception {
        filter(false).doFilter(request("/externalapi/v1/ping"), response, chain);

        assertNotFoundWithoutBody();
    }

    @Test
    void shouldAnswerWithAnEmptyNotFoundForAWrongKey() throws Exception {
        MockHttpServletRequest request = request("/externalapi/v1/ping");
        request.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, "wrong");

        filter(false).doFilter(request, response, chain);

        assertNotFoundWithoutBody();
    }

    /**
     * A fresh install has no key. It must not be reachable by accident, so the surface stays closed rather than
     * accepting an empty key.
     */
    @Test
    void shouldAnswerWithNotFoundWhenNoKeyIsConfigured() throws Exception {
        baseConfig.getMain().setApiKey("");
        MockHttpServletRequest request = request("/externalapi/v1/ping");
        request.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, "");

        filter(false).doFilter(request, response, chain);

        assertNotFoundWithoutBody();
    }

    @Test
    void shouldAnswerWithNotFoundForUnknownSubPathsToo() throws Exception {
        filter(false).doFilter(request("/externalapi/v1/nothing"), response, chain);

        assertNotFoundWithoutBody();
    }

    /**
     * The path is matched after decoding, so an encoded prefix cannot slip past the key check into a handler mapping
     * that decodes the path itself.
     */
    @Test
    void shouldAnswerWithNotFoundForAPercentEncodedPrefixToo() throws Exception {
        filter(false).doFilter(request("/%65xternalapi/v1/ping"), response, chain);

        assertNotFoundWithoutBody();
    }

    @Test
    void shouldNotTouchRequestsOutsideTheExternalApi() throws Exception {
        MockHttpServletRequest request = request("/internalapi/config");

        filter(false).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void shouldRecogniseTheExternalApiBehindANonRootUrlBase() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/nzbhydra/externalapi/v1/ping");
        request.setContextPath("/nzbhydra");

        filter(false).doFilter(request, response, chain);

        assertNotFoundWithoutBody();
    }

    @Test
    void shouldSkipTheCheckWhenTheDevelopmentPropertyIsSet() throws Exception {
        MockHttpServletRequest request = request("/externalapi/v1/ping");

        filter(true).doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    /**
     * The key must not end up in a log file at any level - not even the wrong one somebody typed, which may well be
     * the right key of another instance.
     */
    @Test
    void shouldNeverLogTheOfferedKey() throws Exception {
        ch.qos.logback.classic.Logger filterLogger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(ExternalApiKeyFilter.class);
        Level previousLevel = filterLogger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        filterLogger.addAppender(appender);
        filterLogger.setLevel(Level.TRACE);
        try {
            MockHttpServletRequest rejected = request("/externalapi/v1/ping");
            rejected.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, "some-secret-key");
            filter(false).doFilter(rejected, response, chain);

            MockHttpServletRequest accepted = request("/externalapi/v1/ping");
            accepted.addHeader(ExternalApiKeyFilter.API_KEY_HEADER, CONFIGURED_KEY);
            filter(false).doFilter(accepted, new MockHttpServletResponse(), chain);

            List<String> messages = appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
            assertThat(messages).isNotEmpty();
            assertThat(messages).noneMatch(message -> message.contains("some-secret-key"));
            assertThat(messages).noneMatch(message -> message.contains(CONFIGURED_KEY));
        } finally {
            filterLogger.detachAppender(appender);
            filterLogger.setLevel(previousLevel);
            appender.stop();
        }
    }

    private void assertNotFoundWithoutBody() throws Exception {
        verify(chain, never()).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        assertThat(response.getStatus()).isEqualTo(404);
        assertThat(response.getContentAsString()).isEmpty();
        assertThat(response.getCookies()).isEmpty();
        assertThat(response.getHeaderNames()).doesNotContain("WWW-Authenticate", "Set-Cookie", "Location");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private ExternalApiKeyFilter filter(boolean noApiKeyNeeded) {
        return new ExternalApiKeyFilter(configProvider, noApiKeyNeeded);
    }

    private MockHttpServletRequest request(String uri) {
        return new MockHttpServletRequest("GET", uri);
    }
}
