package org.nzbhydra.auth;

import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.externalapi.ExternalApiKeyFilter;
import org.springframework.context.annotation.AnnotatedBeanDefinitionReader;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.GenericWebApplicationContext;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers {@link SecurityConfig}'s CSRF configuration against the real filter chain: whether protection is on at all,
 * which paths are exempt from it, and whether the token cookie is written early enough for the SPA to use it.
 *
 * <p>A minimal web context with a mocked {@link ConfigProvider} rather than {@code @SpringBootTest}: booting the whole
 * application in core's test scope is known-flaky (see {@code ConfigWebTest}) and would fix the config to whatever
 * {@code baseConfig.yml} says, while these tests have to vary {@code main.useCsrf} per case. The trade-off is that the
 * application's own controllers are not registered, so a stand-in controller below maps the paths under test; what is
 * exercised for real is the filter chain {@link SecurityConfig} builds, which is where all the behaviour lives.
 * {@link OidcLoginComponentTest} is the precedent for this setup.
 */
class SecurityConfigTest {

    private static final String CSRF_COOKIE_NAME = "HYDRA-XSRF-TOKEN";
    private static final String CSRF_HEADER_NAME = "X-XSRF-TOKEN";
    private static final String USE_CSRF_PROPERTY = "main.useCsrf";
    private static final String INTERNAL_API_KEY_PROPERTY = "internalApiKey";
    private static final String INTERNAL_API_KEY = "the-internal-api-key";
    private static final String API_KEY = "the-api-key";

    private String previousUseCsrfProperty;
    private String previousInternalApiKeyProperty;

    @BeforeEach
    void rememberProperties() {
        previousUseCsrfProperty = System.getProperty(USE_CSRF_PROPERTY);
        previousInternalApiKeyProperty = System.getProperty(INTERNAL_API_KEY_PROPERTY);
        System.clearProperty(USE_CSRF_PROPERTY);
        System.setProperty(INTERNAL_API_KEY_PROPERTY, INTERNAL_API_KEY);
    }

    @AfterEach
    void restoreProperties() {
        restoreProperty(USE_CSRF_PROPERTY, previousUseCsrfProperty);
        restoreProperty(INTERNAL_API_KEY_PROPERTY, previousInternalApiKeyProperty);
    }

    private static void restoreProperty(String key, String previousValue) {
        if (previousValue == null) {
            System.clearProperty(key);
        } else {
            System.setProperty(key, previousValue);
        }
    }

    @Test
    void shouldRejectUnsafeInternalApiRequestWithoutCsrfToken() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            mockMvc(context).perform(post("/internalapi/config"))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void shouldAcceptUnsafeInternalApiRequestWithCsrfCookieAndHeader() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            MockMvc mockMvc = mockMvc(context);
            Cookie token = tokenCookie(mockMvc);

            mockMvc.perform(post("/internalapi/config")
                    .cookie(token)
                    .header(CSRF_HEADER_NAME, token.getValue()))
                .andExpect(status().isOk());
        }
    }

    /**
     * The React transport reads the token from the cookie, so the cookie has to exist before the first unsafe request.
     * Spring Security 6 and later defer loading the token, which means a plain GET of the SPA shell writes no cookie
     * unless something resolves the token; {@link SecurityConfig} adds a filter that does.
     */
    @Test
    void shouldWriteCsrfCookieOnFirstGetOfTheSpa() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            Cookie cookie = mockMvc(context).perform(get("/"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie(CSRF_COOKIE_NAME);

            assertThat(cookie).isNotNull();
            assertThat(cookie.getValue()).isNotBlank();
            assertThat(cookie.isHttpOnly()).isFalse();
            //The default: CookieCsrfTokenRepository then uses the context path, so a non-root main.urlBase is covered
            assertThat(cookie.getPath()).isEqualTo("/");
        }
    }

    @Test
    void shouldNotRequireCsrfTokenOnPathsUsedByNonBrowserClients() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            MockMvc mockMvc = mockMvc(context);

            mockMvc.perform(get("/api").param("t", "caps").param("apikey", "apikey"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/api").param("apikey", "apikey"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/torznab/api").param("apikey", "apikey"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/rss").param("apikey", "apikey"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/getnzb/api/1234").param("apikey", "apikey"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/gettorrent/api/1234").param("apikey", "apikey"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/websocket/123/abc/xhr_send"))
                .andExpect(status().isOk());
            mockMvc.perform(post("/actuator/shutdown"))
                .andExpect(status().isOk());
        }
    }

    @Test
    void shouldNotRequireCsrfTokenForRequestsAuthenticatedByTheInternalApiKey() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            MockMvc mockMvc = mockMvc(context);

            mockMvc.perform(post("/internalapi/control/shutdown").param(INTERNAL_API_KEY_PROPERTY, INTERNAL_API_KEY))
                .andExpect(status().isOk());
            //Presence of the parameter must not be enough - otherwise anyone could opt out of CSRF protection
            mockMvc.perform(post("/internalapi/control/shutdown").param(INTERNAL_API_KEY_PROPERTY, "guessed"))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void shouldDisableCsrfWhenTheSystemPropertyOverridesAnEnablingConfig() throws Exception {
        System.setProperty(USE_CSRF_PROPERTY, "false");
        try (GenericWebApplicationContext context = buildContext(true)) {
            mockMvc(context).perform(post("/internalapi/config"))
                .andExpect(status().isOk());
        }
    }

    @Test
    void shouldEnableCsrfWhenTheSystemPropertyOverridesADisablingConfig() throws Exception {
        System.setProperty(USE_CSRF_PROPERTY, "true");
        try (GenericWebApplicationContext context = buildContext(false)) {
            mockMvc(context).perform(post("/internalapi/config"))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void shouldFollowTheConfigWhenNoSystemPropertyIsSet() throws Exception {
        try (GenericWebApplicationContext context = buildContext(false)) {
            mockMvc(context).perform(post("/internalapi/config"))
                .andExpect(status().isOk());
        }
    }

    /**
     * The cookie has to be readable on every path the application is served under, or the SPA loaded from a deep link
     * under a non-root {@code main.urlBase} finds no token. Leaving the repository's cookie path unset is what buys
     * this: it then follows the request's context path.
     */
    @Test
    void shouldScopeTheCsrfCookieToTheContextPath() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true, new MockServletContext("/nzbhydra"))) {
            Cookie cookie = mockMvc(context).perform(get("/nzbhydra/").contextPath("/nzbhydra"))
                .andReturn().getResponse().getCookie(CSRF_COOKIE_NAME);

            assertThat(cookie).isNotNull();
            assertThat(cookie.getPath()).isEqualTo("/nzbhydra");
        }
    }

    /**
     * A blank key must exempt nothing. Comparing only for presence, or treating "" as a configured key, would let any
     * request opt out of CSRF protection by appending an empty parameter.
     */
    @Test
    void shouldNotExemptRequestsWhenNoInternalApiKeyIsConfigured() throws Exception {
        System.setProperty(INTERNAL_API_KEY_PROPERTY, "");
        try (GenericWebApplicationContext context = buildContext(true)) {
            mockMvc(context).perform(post("/internalapi/config").param(INTERNAL_API_KEY_PROPERTY, ""))
                .andExpect(status().isForbidden());
        }
    }

    /**
     * The whole external API surface is invisible without the key, and it must stay that way through the real filter
     * chain: no 401, no redirect to the login page, no hint that the path exists.
     */
    @Test
    void shouldAnswerExternalApiRequestsWithoutAKeyWithAnEmptyNotFound() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            MockMvc mockMvc = mockMvc(context);

            assertBodylessNotFound(mockMvc.perform(get("/externalapi/v1/ping")));
            assertBodylessNotFound(mockMvc.perform(get("/externalapi/v1/ping").param("apikey", "guessed")));
            assertBodylessNotFound(mockMvc.perform(get("/externalapi/v1/nothing")));
            assertBodylessNotFound(mockMvc.perform(post("/externalapi/v1/backups")));
        }
    }

    /**
     * Not just an empty body: the 404 must give a client nothing at all, and a {@value #CSRF_COOKIE_NAME} cookie
     * would be something. That is why {@link SecurityConfig} registers the key filter before {@link CsrfFilter},
     * which writes the cookie as it resolves the deferred token. Asserted through the real filter chain because the
     * filter on its own cannot show what the filters around it do.
     */
    private void assertBodylessNotFound(ResultActions resultActions) throws Exception {
        MockHttpServletResponse response = resultActions
            .andExpect(status().isNotFound())
            .andExpect(content().string(""))
            .andReturn().getResponse();

        assertThat(response.getCookies()).isEmpty();
        assertThat(response.getHeader("Set-Cookie")).isNull();
        assertThat(response.getHeaderNames()).doesNotContain("Set-Cookie", "WWW-Authenticate", "Location");
    }

    /**
     * The reason the external API exists: a script with the key and no browser can POST without first fetching a CSRF
     * token, which {@code /internalapi} has required since CSRF protection was actually turned on.
     */
    @Test
    void shouldNotRequireCsrfTokenForUnsafeExternalApiRequestsAuthenticatedByTheApiKey() throws Exception {
        try (GenericWebApplicationContext context = buildContext(true)) {
            MockMvc mockMvc = mockMvc(context);

            mockMvc.perform(post("/externalapi/v1/backups").header("X-Api-Key", API_KEY))
                .andExpect(status().isOk());
            mockMvc.perform(post("/externalapi/v1/backups").param("apikey", API_KEY))
                .andExpect(status().isOk());
        }
    }

    private Cookie tokenCookie(MockMvc mockMvc) throws Exception {
        Cookie cookie = mockMvc.perform(get("/")).andReturn().getResponse().getCookie(CSRF_COOKIE_NAME);
        assertThat(cookie).as("The SPA shell must hand out a CSRF token cookie").isNotNull();
        return cookie;
    }

    private MockMvc mockMvc(GenericWebApplicationContext context) {
        return MockMvcBuilders.webAppContextSetup(context)
            .addFilters(context.getBean("springSecurityFilterChain", Filter.class))
            .build();
    }

    private GenericWebApplicationContext buildContext(boolean useCsrf) {
        return buildContext(useCsrf, new MockServletContext());
    }

    private GenericWebApplicationContext buildContext(boolean useCsrf, MockServletContext servletContext) {
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.getMain().setUseCsrf(useCsrf);
        //Without an auth type SecurityConfig treats auth as configured and adds its role rules on top, and a 403 could
        //then mean either a CSRF rejection or a missing role. With NONE every request is permitted and a 403 can only
        //come from the CSRF filter, which is what these tests are about.
        baseConfig.getAuth().setAuthType(AuthType.NONE);
        baseConfig.getMain().setApiKey(API_KEY);

        ConfigProvider configProvider = Mockito.mock(ConfigProvider.class);
        Mockito.when(configProvider.getBaseConfig()).thenReturn(baseConfig);

        HydraAnonymousAuthenticationFilter anonymousFilter = Mockito.mock(HydraAnonymousAuthenticationFilter.class);
        Mockito.when(anonymousFilter.getAuthorities()).thenReturn(List.of());

        GenericWebApplicationContext context = new GenericWebApplicationContext(servletContext);
        context.getBeanFactory().registerSingleton("configProvider", configProvider);
        context.getBeanFactory().registerSingleton("hydraUserDetailsManager", Mockito.mock(HydraUserDetailsManager.class));
        context.getBeanFactory().registerSingleton("hydraAnonymousAuthenticationFilter", anonymousFilter);
        context.getBeanFactory().registerSingleton("authAndAccessEventHandler", accessDeniedHandler());
        context.getBeanFactory().registerSingleton("asyncSupportFilter", new AsyncSupportFilter());
        context.getBeanFactory().registerSingleton("externalApiKeyFilter", new ExternalApiKeyFilter(configProvider, false));
        AnnotatedBeanDefinitionReader reader = new AnnotatedBeanDefinitionReader(context);
        reader.register(SecurityConfig.class);
        reader.register(EndpointsUnderTest.class);
        context.refresh();
        return context;
    }

    /**
     * The real handler logs the access attempt and needs collaborators this test has no use for, but a plain mock
     * would silently swallow every rejection and leave the response at its default 200 - so the mock delegates to
     * Spring's own handler, which is what {@link AuthAndAccessEventHandler} extends.
     */
    private AuthAndAccessEventHandler accessDeniedHandler() {
        AuthAndAccessEventHandler handler = Mockito.mock(AuthAndAccessEventHandler.class);
        AccessDeniedHandlerImpl delegate = new AccessDeniedHandlerImpl();
        try {
            Mockito.doAnswer(invocation -> {
                delegate.handle(invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2));
                return null;
            }).when(handler).handle(Mockito.any(), Mockito.any(), Mockito.any());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
        return handler;
    }

    /**
     * Stands in for the application's controllers so that a request which passes the CSRF filter ends in 200 rather
     * than the 404 of an unmapped path, which would otherwise be hard to tell from a rejection.
     */
    @RestController
    static class EndpointsUnderTest {

        @RequestMapping({"/",
            "/api",
            "/rss",
            "/torznab/api",
            "/websocket/**",
            "/actuator/**",
            "/getnzb/api/**",
            "/gettorrent/api/**",
            "/internalapi/config",
            "/internalapi/control/shutdown",
            "/externalapi/**"})
        public String anyEndpoint() {
            return "reached";
        }
    }
}
