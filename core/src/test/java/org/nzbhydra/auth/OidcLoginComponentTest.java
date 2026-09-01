package org.nzbhydra.auth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.context.annotation.AnnotatedBeanDefinitionReader;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.GenericWebApplicationContext;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Component test for the OIDC authorization code login: it runs the {@link SecurityConfig} OIDC filter chain against a
 * stub OIDC provider served over real HTTP, so the token exchange goes through Spring Security's actual
 * {@code RestClient} (including its classpath-based request factory detection) and the ID token is validated against a
 * real JWK set endpoint.
 *
 * <p>This is a regression guard for a classpath bug: htmlunit used to drag in Jetty 9's {@code jetty-client}, which
 * made Spring's {@code RestClient} pick {@code JettyClientHttpRequestFactory} (compiled against Jetty 12) and the
 * token exchange died with {@code NoSuchMethodError: HttpClient.newRequest(URI)}. Only a test that performs the real
 * outbound HTTP call catches that class of failure, so the provider here is a real server, not a mocked client.
 * The JWK set endpoint additionally answers slower than the 500ms that Spring Security 7's default decoder tolerates,
 * guarding {@link SecurityConfig#idTokenDecoderFactory()}'s more generous timeouts.
 *
 * <p>A minimal web context rather than {@code @SpringBootTest}: booting the whole application in core's test scope is
 * known-flaky (see {@code ConfigWebTest}), and the flow under test lives entirely in the security filter chain.
 * {@code SystemTestStateResetWebTest} is the precedent for this setup. Collaborators of {@link SecurityConfig} that
 * the flow doesn't exercise are registered as manual mock singletons, which skips bean post-processing on them.
 */
class OidcLoginComponentTest {

    private static final String CLIENT_ID = "hydra-client";
    private static final String OIDC_USERNAME = "oidcuser";

    private static HttpServer oidcProvider;
    private static RSAKey rsaKey;
    private static volatile String expectedNonce;

    @BeforeAll
    static void startOidcProvider() throws Exception {
        rsaKey = new RSAKeyGenerator(2048).keyID("test-key").generate();
        oidcProvider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        oidcProvider.createContext("/token", exchange -> {
            String tokenResponse = """
                {"access_token":"test-access-token","token_type":"Bearer","expires_in":3600,"scope":"openid profile email","id_token":"%s"}
                """.formatted(signIdToken());
            respond(exchange, "application/json", tokenResponse);
        });
        oidcProvider.createContext("/jwks", exchange -> {
            //Spring Security 7's default JWK set fetch times out after 500ms, which real providers regularly exceed;
            //SecurityConfig overrides that, and this delay fails the test if that override is ever lost
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            respond(exchange, "application/json", new JWKSet(rsaKey.toPublicJWK()).toString());
        });
        oidcProvider.start();
    }

    @AfterAll
    static void stopOidcProvider() {
        oidcProvider.stop(0);
    }

    @Test
    void shouldCompleteOidcAuthorizationCodeLogin() throws Exception {
        try (GenericWebApplicationContext context = buildContext()) {
            MockMvc mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class))
                .build();

            //Step 1: hitting the authorization endpoint must redirect to the provider and store the authorization request in the session
            MvcResult authorizationResult = mockMvc.perform(get("/oauth2/authorization/nzbhydra2"))
                .andExpect(status().is3xxRedirection())
                .andReturn();
            String location = authorizationResult.getResponse().getRedirectedUrl();
            assertThat(location).startsWith(providerUrl("/auth"));
            MockHttpSession session = (MockHttpSession) authorizationResult.getRequest().getSession(false);
            assertThat(session).isNotNull();

            //The provider would echo state and nonce back to the callback and into the ID token, both URL-decoded
            var authorizationParams = UriComponentsBuilder.fromUriString(location).build().getQueryParams();
            String state = URLDecoder.decode(authorizationParams.getFirst("state"), StandardCharsets.UTF_8);
            expectedNonce = URLDecoder.decode(authorizationParams.getFirst("nonce"), StandardCharsets.UTF_8);
            assertThat(state).isNotBlank();
            assertThat(expectedNonce).isNotBlank();

            //Step 2: the callback triggers the real token exchange over HTTP, ID token validation against the JWK set
            //and the user lookup, and must end in an authenticated session
            MvcResult callbackResult = mockMvc.perform(get("/login/oauth2/code/nzbhydra2")
                    .param("code", "test-code")
                    .param("state", state)
                    .session(session))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"))
                .andReturn();

            SecurityContext securityContext = (SecurityContext) callbackResult.getRequest().getSession()
                .getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
            assertThat(securityContext).isNotNull();
            assertThat(securityContext.getAuthentication()).isInstanceOf(OAuth2AuthenticationToken.class);
            assertThat(securityContext.getAuthentication().getName()).isEqualTo(OIDC_USERNAME);
            assertThat(securityContext.getAuthentication().getAuthorities())
                .extracting(Object::toString)
                .contains("ROLE_ADMIN");

            //The login must lengthen the session beyond the server-wide 60s timeout: OIDC has no remember-me cookie
            //and no per-request re-authentication, so an expired session means 401s for all background requests
            assertThat(callbackResult.getRequest().getSession().getMaxInactiveInterval())
                .isGreaterThanOrEqualTo(60 * 60 * 24);
        }
    }

    private GenericWebApplicationContext buildContext() {
        BaseConfig baseConfig = new BaseConfig();
        AuthConfig authConfig = baseConfig.getAuth();
        authConfig.setAuthType(AuthType.OIDC);
        authConfig.setOidcClientId(CLIENT_ID);
        authConfig.setOidcClientSecret("test-secret");
        authConfig.setOidcAuthorizationUri(providerUrl("/auth"));
        authConfig.setOidcTokenUri(providerUrl("/token"));
        authConfig.setOidcJwkSetUri(providerUrl("/jwks"));

        ConfigProvider configProvider = Mockito.mock(ConfigProvider.class);
        Mockito.when(configProvider.getBaseConfig()).thenReturn(baseConfig);

        HydraUserDetailsManager userDetailsManager = Mockito.mock(HydraUserDetailsManager.class);
        Mockito.when(userDetailsManager.loadUserByUsername(anyString())).thenReturn(
            new User(OIDC_USERNAME, "irrelevant", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        HydraAnonymousAuthenticationFilter anonymousFilter = Mockito.mock(HydraAnonymousAuthenticationFilter.class);
        Mockito.when(anonymousFilter.getAuthorities()).thenReturn(List.of());

        GenericWebApplicationContext context = new GenericWebApplicationContext(new MockServletContext());
        context.getBeanFactory().registerSingleton("configProvider", configProvider);
        context.getBeanFactory().registerSingleton("hydraUserDetailsManager", userDetailsManager);
        context.getBeanFactory().registerSingleton("hydraAnonymousAuthenticationFilter", anonymousFilter);
        context.getBeanFactory().registerSingleton("authAndAccessEventHandler", Mockito.mock(AuthAndAccessEventHandler.class));
        context.getBeanFactory().registerSingleton("asyncSupportFilter", new AsyncSupportFilter());
        new AnnotatedBeanDefinitionReader(context).register(SecurityConfig.class);
        context.refresh();
        return context;
    }

    private static String providerUrl(String path) {
        return "http://127.0.0.1:" + oidcProvider.getAddress().getPort() + path;
    }

    private static String signIdToken() {
        try {
            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(providerUrl("/"))
                .subject("test-subject")
                .audience(CLIENT_ID)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(300)))
                .claim("nonce", expectedNonce)
                .claim("preferred_username", OIDC_USERNAME)
                .build();
            SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(rsaKey.getKeyID()).build(), claims);
            jwt.sign(new RSASSASigner(rsaKey));
            return jwt.serialize();
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign test ID token", e);
        }
    }

    private static void respond(com.sun.net.httpserver.HttpExchange exchange, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(bytes);
        }
    }
}
