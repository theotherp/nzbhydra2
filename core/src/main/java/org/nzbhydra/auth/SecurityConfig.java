package org.nzbhydra.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.AuthType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenDecoderFactory;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenValidator;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.ClientRegistrations;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.converter.ClaimTypeConverter;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoderFactory;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.ForwardedHeaderFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.filter.UrlHandlerFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@SuppressWarnings("removal")
@Configuration(proxyBeanMethods = false)
@Order
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);
    private static final int SECONDS_PER_DAY = 60 * 60 * 24;
    private static final String OIDC_REGISTRATION_ID = "nzbhydra2";
    private static final int JWKS_TIMEOUT_MS = 15_000;
    private static final String OIDC_AUTHORIZATION_REQUEST_NOT_FOUND = "authorization_request_not_found";
    private static final String CSRF_COOKIE_NAME = "HYDRA-XSRF-TOKEN";
    /**
     * System property that overrides {@code main.useCsrf} from the config. Only tests set it; production leaves it
     * unset so that the config value governs.
     */
    private static final String USE_CSRF_PROPERTY = "main.useCsrf";
    private static final String INTERNAL_API_KEY_PARAMETER = "internalApiKey";

    /**
     * Paths that are only ever called by clients which cannot send the {@code X-XSRF-TOKEN} header:
     * <ul>
     *     <li>{@code /api}, {@code /rss}, {@code /torznab/api} and their per-indexer variants are the Newznab and
     *     Torznab API that Sonarr, Radarr, NZB clients and the like call. They authenticate with the {@code apikey}
     *     parameter, never with a session cookie, and {@link org.nzbhydra.api.ExternalApi} maps them without a method
     *     restriction, so a client may POST. {@code /api/**} also covers
     *     {@link org.nzbhydra.api.stats.ExternalApiStats}.</li>
     *     <li>{@code /getnzb/api/**} and {@code /gettorrent/api/**} are the apikey-authenticated download links handed
     *     to download clients. Their siblings {@code /getnzb/user/**} and {@code /gettorrent/user/**} are mapped
     *     without a method restriction too, but they authenticate the logged-in user (ROLE_USER) and the browser only
     *     ever fetches them with GET, so they deliberately stay protected.</li>
     *     <li>{@code /websocket/**} is the SockJS endpoint. Its fallback transports POST to
     *     {@code /websocket/{server}/{session}/xhr_send} and sockjs-client cannot attach a header to those requests.</li>
     *     <li>{@code /actuator/**} is called by monitoring and by the system test runner (POST /actuator/shutdown).
     *     The only unsafe actuator endpoint, shutdown, is disabled unless
     *     {@code management.endpoint.shutdown.enabled=true} is passed explicitly, which no production start does.</li>
     * </ul>
     * Everything else, {@code /internalapi/**} and the form login and logout above all, stays protected: the React
     * transport sends the token from the {@value #CSRF_COOKIE_NAME} cookie on every unsafe request.
     */
    private static final List<String> CSRF_EXEMPT_PATH_PATTERNS = List.of(
            "/api",
            "/api/**",
            "/rss",
            "/rss/**",
            "/torznab/api",
            "/torznab/api/**",
            "/getnzb/api/**",
            "/gettorrent/api/**",
            "/websocket/**",
            "/actuator/**");

    /**
     * Additionally skipped by the {@link CsrfCookieFilter}, but deliberately <em>not</em> exempt from CSRF itself:
     * these are the asset handlers from {@code WebConfiguration.addResourceHandlers} worth skipping (the React bundle
     * lives under {@code /static/react/assets}; {@code /swagger-ui/**} is left alone). Putting a {@code Set-Cookie} on
     * every asset response would keep them from being cached by a reverse proxy, and nothing fetching them reads the token.
     */
    private static final List<String> CSRF_COOKIE_SKIPPED_PATH_PATTERNS = List.of(
            "/static/**",
            "/additionalStatic/**",
            "/favicon.*");

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private HydraAnonymousAuthenticationFilter hydraAnonymousAuthenticationFilter;
    @Autowired
    private HydraUserDetailsManager hydraUserDetailsManager;
    @Autowired
    private AuthAndAccessEventHandler authAndAccessEventHandler;
    @Autowired
    private UserDetailsService userDetailsService;
    @Autowired
    private AsyncSupportFilter asyncSupportFilter;
    private HeaderAuthenticationFilter headerAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AuthenticationManager authenticationManager) throws Exception {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        if (isCsrfEnabled()) {
            CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
            csrfTokenRepository.setCookieName(CSRF_COOKIE_NAME);
            //The cookie path is deliberately left unset: CookieCsrfTokenRepository then uses the request's context
            //path, which is main.urlBase (see application.properties), so the cookie covers a non-root URL base.
            //https://docs.spring.io/spring-security/reference/5.8/migration/servlet/exploits.html#_i_am_using_angularjs_or_another_javascript_framework
            CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
            requestHandler.setCsrfRequestAttributeName(null);
            RequestMatcher exemptMatcher = csrfExemptRequestMatcher();
            http.csrf(csrf -> csrf
                    .csrfTokenRepository(csrfTokenRepository)
                    .csrfTokenRequestHandler(requestHandler)
                    .ignoringRequestMatchers(exemptMatcher));
            //Spring Security defers loading the token, so a plain GET of the SPA shell would never write the cookie
            //and the first unsafe request would have no token to send. Resolving the token here forces the repository
            //to save it. Setting csrfRequestAttributeName to null alone does not do this - it only names the request
            //attribute; the value behind it stays a lazy supplier (CsrfTokenRequestAttributeHandler.SupplierCsrfToken).
            http.addFilterAfter(new CsrfCookieFilter(csrfCookieSkippedRequestMatcher(exemptMatcher)), CsrfFilter.class);
        } else {
            logger.info("CSRF is disabled");
            http.csrf(csrf -> csrf.disable());
        }
        http.headers(headers -> headers
                .httpStrictTransportSecurity(security -> security.disable())
                .frameOptions(options -> options.disable()));
        if (baseConfig.getAuth().getAuthType() != AuthType.OIDC) {
            headerAuthenticationFilter = new HeaderAuthenticationFilter(authenticationManager, hydraUserDetailsManager,
                    baseConfig.getAuth());
            http.addFilterAfter(headerAuthenticationFilter, BasicAuthenticationFilter.class);
        }

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC || NzbHydra.isNativeBuild()) {
            http = http
                    .httpBasic(basic -> basic
                            .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                                @Override
                                public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                                    return new HydraWebAuthenticationDetails(context);
                                }
                            }));
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http = http
                    .formLogin(login -> login
                            .loginPage("/login")
                            .loginProcessingUrl("/login")
                            .defaultSuccessUrl("/")
                            .permitAll()
                            .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                                @Override
                                public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                                    return new HydraWebAuthenticationDetails(context);
                                }
                            }));
        } else if (baseConfig.getAuth().getAuthType() == AuthType.OIDC) {
            ClientRegistrationRepository clientRegistrationRepository = getOidcClientRegistrationRepository(baseConfig.getAuth());
            String oidcAuthorizationUrl = "/oauth2/authorization/" + OIDC_REGISTRATION_ID;
            http = http
                    .oauth2Login(login -> login
                            .clientRegistrationRepository(clientRegistrationRepository)
                            .loginPage("/login")
                            .failureHandler((request, response, exception) -> {
                                if (isAuthorizationRequestNotFound(exception)) {
                                    logger.warn("OIDC callback has no matching authorization request. Check that the browser accepts the session cookie and that the configured external URL, protocol, and host are consistent.");
                                    response.sendRedirect(request.getContextPath() + "/login?error");
                                    return;
                                }
                                logger.warn("OIDC login failed", exception);
                                response.sendRedirect(request.getContextPath() + "/login?error");
                            })
                            .userInfoEndpoint(endpoint -> endpoint
                                .oidcUserService(getOidcUserService(baseConfig.getAuth())))
                        .successHandler(getOidcSuccessHandler(baseConfig.getAuth())));
            //Background requests (XHR / fetch) must get a 401 instead of a redirect into the cross-origin OIDC flow, which the browser cannot complete for them (#1080)
            http.exceptionHandling(handling -> handling.authenticationEntryPoint(new OidcAuthenticationEntryPoint(oidcAuthorizationUrl)));
        }
        if (baseConfig.getAuth().isAuthConfigured() || NzbHydra.isNativeBuild()) {
            http = http
                    .authorizeHttpRequests(requests -> requests
                            .requestMatchers("/actuator/health/ping")
                            .permitAll()
                            .requestMatchers("/login", "/oauth2/**", "/login/oauth2/**")
                            .permitAll()
                            .requestMatchers("/internalapi/")
                            .authenticated()
                            .requestMatchers("/websocket/")
                            .authenticated()
                            .requestMatchers("/actuator/**")
                            .hasRole("ADMIN")
                            .requestMatchers("/static/**")
                            .permitAll()
                            .anyRequest()
//                .authenticated() //Does not include anonymous
                            .hasAnyRole("ADMIN", "ANONYMOUS", "USER"))
                    .logout(logout -> logout
                            .permitAll()
                            .logoutUrl("/logout")
                            .logoutSuccessUrl("/")
                            .deleteCookies("remember-me")
                            .invalidateHttpSession(true)
                            .clearAuthentication(true))
            ;
            enableAnonymousAccessIfConfigured(http);

            if (baseConfig.getAuth().isRememberUsers() && baseConfig.getAuth().getAuthType() != AuthType.OIDC) {
                int rememberMeValidityDays = configProvider.getBaseConfig().getAuth().getRememberMeValidityDays();
                if (rememberMeValidityDays == 0) {
                    rememberMeValidityDays = 1000; //Can't be disabled, three years should be enough
                }
                int rememberMeValiditySeconds = rememberMeValidityDays * SECONDS_PER_DAY;
                http = http
                        .rememberMe(me -> me
                                .alwaysRemember(true)
                                .tokenValiditySeconds(rememberMeValiditySeconds)
                                .userDetailsService(userDetailsService));
            }

            http.addFilterAfter(asyncSupportFilter, BasicAuthenticationFilter.class);

        } else {
            http.authorizeHttpRequests(requests -> requests.anyRequest().permitAll());
        }
        http.exceptionHandling(handling -> handling.accessDeniedHandler(authAndAccessEventHandler));

        http.addFilterBefore(new ForwardedForRecognizingFilter(), SecurityContextHolderFilter.class);
        //We need to extract the original IP before it's removed and not retrievable anymore by the ForwardedHeaderFilter
        http.addFilterAfter(new ForwardedHeaderFilter(), ForwardedForRecognizingFilter.class);
        http.addFilterAfter(UrlHandlerFilter.trailingSlashHandler("/**").wrapRequest().build(), ForwardedHeaderFilter.class);
        return http.build();
    }


    /**
     * CSRF protection is governed by {@code main.useCsrf} from the config. The {@value #USE_CSRF_PROPERTY} system
     * property is an explicit override for tests only: absent the config decides, {@code false} disables it whatever
     * the config says and {@code true} enables it.
     */
    private boolean isCsrfEnabled() {
        String override = System.getProperty(USE_CSRF_PROPERTY);
        if (override != null) {
            logger.info("CSRF protection is {} by the system property {}", Boolean.parseBoolean(override) ? "enabled" : "disabled", USE_CSRF_PROPERTY);
            return Boolean.parseBoolean(override);
        }
        return configProvider.getBaseConfig().getMain().isUseCsrf();
    }

    private RequestMatcher csrfExemptRequestMatcher() {
        List<RequestMatcher> matchers = new ArrayList<>(pathMatchers(CSRF_EXEMPT_PATH_PATTERNS));
        matchers.add(internalApiKeyRequestMatcher());
        return new OrRequestMatcher(matchers);
    }

    /**
     * What the {@link CsrfCookieFilter} skips: everything CSRF itself ignores, plus the static assets. The two lists
     * are deliberately separate - a static asset must still not be able to opt out of CSRF protection.
     */
    private RequestMatcher csrfCookieSkippedRequestMatcher(RequestMatcher exemptMatcher) {
        List<RequestMatcher> matchers = new ArrayList<>(pathMatchers(CSRF_COOKIE_SKIPPED_PATH_PATTERNS));
        matchers.add(exemptMatcher);
        return new OrRequestMatcher(matchers);
    }

    private List<RequestMatcher> pathMatchers(List<String> patterns) {
        PathPatternRequestMatcher.Builder matcherBuilder = PathPatternRequestMatcher.withDefaults();
        return patterns.stream()
                .map(matcherBuilder::matcher)
                .map(RequestMatcher.class::cast)
                .toList();
    }

    /**
     * The wrapper and the system tests call arbitrary endpoints, {@code /internalapi/control/shutdown} among them, by
     * appending the internal API key as a request parameter; {@link HeaderAuthenticationFilter} authenticates them
     * from it without any session. Matching on the key rather than enumerating those paths keeps the exemption in step
     * with whatever the wrapper calls next. The key itself is compared, not just its presence - otherwise any request
     * could opt out of CSRF by appending a made-up value. Without the system property (the normal case when Hydra is
     * started without the wrapper) nothing matches.
     */
    private RequestMatcher internalApiKeyRequestMatcher() {
        String internalApiKey = System.getProperty(INTERNAL_API_KEY_PARAMETER);
        if (!StringUtils.hasText(internalApiKey)) {
            //An empty or blank key would otherwise exempt every request that sends an empty internalApiKey parameter
            return request -> false;
        }
        byte[] expected = internalApiKey.getBytes(StandardCharsets.UTF_8);
        return request -> {
            String sent = request.getParameter(INTERNAL_API_KEY_PARAMETER);
            return sent != null && MessageDigest.isEqual(sent.getBytes(StandardCharsets.UTF_8), expected);
        };
    }

    /**
     * Resolves the deferred {@link CsrfToken} so that {@link CookieCsrfTokenRepository} actually writes the cookie,
     * which is what Spring's SPA guidance calls a {@code CsrfCookieFilter}. Skipped for the exempt paths and the
     * static assets - neither reads the cookie, and there is no reason to put a {@code Set-Cookie} on every API and
     * asset response.
     */
    private static class CsrfCookieFilter extends OncePerRequestFilter {

        private final RequestMatcher skippedMatcher;

        CsrfCookieFilter(RequestMatcher skippedMatcher) {
            this.skippedMatcher = skippedMatcher;
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            return skippedMatcher.matches(request);
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                //Renders the token into the response cookie
                csrfToken.getToken();
            }
            filterChain.doFilter(request, response);
        }
    }


    private void enableAnonymousAccessIfConfigured(HttpSecurity http) {
        //Create an anonymous auth filter. If any of the areas are not restricted the anonymous user will get its role
        try {
            if (!hydraAnonymousAuthenticationFilter.getAuthorities().isEmpty()) {
                http.anonymous(anonymous -> anonymous.authenticationFilter(hydraAnonymousAuthenticationFilter));

                hydraAnonymousAuthenticationFilter.enable();

            }

        } catch (Exception e) {
            logger.error("Unable to configure anonymous access", e);
        }
    }

    /**
     * The server-wide session timeout is a deliberately short 60s to keep sessions created by API clients from piling
     * up. Basic auth re-authenticates every request and form auth has the remember-me cookie, but an OIDC session has
     * neither - with the short timeout every pause over a minute made all background requests fail with 401 until the
     * next full page load. So an interactive OIDC login gets a long-lived session instead.
     */
    private AuthenticationSuccessHandler getOidcSuccessHandler(AuthConfig authConfig) {
        SavedRequestAwareAuthenticationSuccessHandler delegate = new SavedRequestAwareAuthenticationSuccessHandler();
        return (request, response, authentication) -> {
            int validityDays = authConfig.isRememberUsers() && authConfig.getRememberMeValidityDays() > 0
                ? authConfig.getRememberMeValidityDays()
                : 1;
            request.getSession().setMaxInactiveInterval(validityDays * SECONDS_PER_DAY);
            delegate.onAuthenticationSuccess(request, response, authentication);
        };
    }

    private boolean isAuthorizationRequestNotFound(AuthenticationException exception) {
        return exception instanceof OAuth2AuthenticationException oauthException &&
               OIDC_AUTHORIZATION_REQUEST_NOT_FOUND.equals(oauthException.getError().getErrorCode());
    }

    private ClientRegistrationRepository getOidcClientRegistrationRepository(AuthConfig authConfig) {
        return new InMemoryClientRegistrationRepository(getOidcClientRegistration(authConfig));
    }

    private ClientRegistration getOidcClientRegistration(AuthConfig authConfig) {
        ClientRegistration.Builder builder;
        if (StringUtils.hasText(authConfig.getOidcIssuerUri())) {
            builder = ClientRegistrations.fromIssuerLocation(authConfig.getOidcIssuerUri());
        } else {
            builder = ClientRegistration.withRegistrationId(OIDC_REGISTRATION_ID)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationUri(authConfig.getOidcAuthorizationUri())
                    .tokenUri(authConfig.getOidcTokenUri())
                    .jwkSetUri(authConfig.getOidcJwkSetUri())
                    .userInfoUri(authConfig.getOidcUserInfoUri());
        }
        return builder
                .registrationId(OIDC_REGISTRATION_ID)
                .clientId(authConfig.getOidcClientId())
                .clientSecret(authConfig.getOidcClientSecret())
                .redirectUri(authConfig.getOidcRedirectUri())
                .scope(getOidcScopes(authConfig))
                .userNameAttributeName(authConfig.getOidcUsernameClaim())
                .clientName("NZBHydra2")
                .build();
    }

    private List<String> getOidcScopes(AuthConfig authConfig) {
        if (authConfig.getOidcScopes() == null || authConfig.getOidcScopes().isEmpty()) {
            return List.of("openid", "profile", "email");
        }
        return authConfig.getOidcScopes();
    }

    private OidcUserService getOidcUserService(AuthConfig authConfig) {
        OidcUserService delegate = new OidcUserService();
        return new OidcUserService() {
            @Override
            public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
                OidcUser oidcUser = delegate.loadUser(userRequest);
                String usernameClaim = authConfig.getOidcUsernameClaim();
                String username = StringUtils.hasText(usernameClaim) ? oidcUser.getClaimAsString(usernameClaim) : null;
                if (!StringUtils.hasText(username)) {
                    username = oidcUser.getName();
                }
                try {
                    var hydraUser = hydraUserDetailsManager.loadUserByUsername(username);
                    if (StringUtils.hasText(usernameClaim) && oidcUser.hasClaim(usernameClaim)) {
                        return new DefaultOidcUser(hydraUser.getAuthorities(), oidcUser.getIdToken(), oidcUser.getUserInfo(), usernameClaim);
                    }
                    return new DefaultOidcUser(hydraUser.getAuthorities(), oidcUser.getIdToken(), oidcUser.getUserInfo());
                } catch (UsernameNotFoundException e) {
                    OAuth2Error error = new OAuth2Error("unauthorized_user", "OIDC user " + username + " is not configured in NZBHydra", null);
                    throw new OAuth2AuthenticationException(error, e);
                }
            }
        };
    }

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        if (headerAuthenticationFilter != null) {
            headerAuthenticationFilter.loadNewConfig(configChangedEvent.getNewConfig().getAuth());
        }
    }

    @Bean
    public DefaultHttpFirewall defaultHttpFirewall() {
        //Allow duplicate trailing slashes which happen when behind a reverse proxy, e.g. proxy_pass http://127.0.0.1:5076/nzbhydra2/;
        return new DefaultHttpFirewall();
    }

    @Bean
    public AuthenticationManager authManager(HttpSecurity http, PasswordEncoder passwordEncoder)
        throws Exception {
        AuthenticationManagerBuilder builder = http.getSharedObject(AuthenticationManagerBuilder.class);
        builder.userDetailsService(hydraUserDetailsManager).passwordEncoder(passwordEncoder);
        return builder.build();
    }

    /**
     * Spring Security 7's default ID token decoder fetches the JWK set with Nimbus's default timeouts of 500ms
     * (connect and read), which real-world providers regularly exceed - the login then fails with a read timeout.
     * This replicates {@link OidcIdTokenDecoderFactory}'s wiring but with generous timeouts.
     */
    @Bean
    public JwtDecoderFactory<ClientRegistration> idTokenDecoderFactory() {
        OidcIdTokenDecoderFactory defaultFactory = new OidcIdTokenDecoderFactory();
        Map<String, JwtDecoder> decoders = new ConcurrentHashMap<>();
        return registration -> decoders.computeIfAbsent(registration.getRegistrationId(), registrationId -> {
            String jwkSetUri = registration.getProviderDetails().getJwkSetUri();
            if (!StringUtils.hasText(jwkSetUri)) {
                return defaultFactory.createDecoder(registration);
            }
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(JWKS_TIMEOUT_MS);
            requestFactory.setReadTimeout(JWKS_TIMEOUT_MS);
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .restOperations(new RestTemplate(requestFactory))
                .build();
            decoder.setJwtValidator(JwtValidators.createDefaultWithValidators(new OidcIdTokenValidator(registration)));
            decoder.setClaimSetConverter(new ClaimTypeConverter(OidcIdTokenDecoderFactory.createDefaultClaimTypeConverters()));
            return decoder;
        });
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Create a delegating password encoder that can handle multiple formats
        // This will handle {bcrypt}, {noop}, and other standard formats
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }


}
