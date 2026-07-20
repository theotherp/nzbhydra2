package org.nzbhydra.auth;

import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.channel.ChannelProcessingFilter;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.ForwardedHeaderFilter;

import java.util.List;

@SuppressWarnings("removal")
@Configuration(proxyBeanMethods = false)
@Order
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);
    private static final int SECONDS_PER_DAY = 60 * 60 * 24;
    private static final String OIDC_REGISTRATION_ID = "nzbhydra2";
    private static final String OIDC_AUTHORIZATION_REQUEST_NOT_FOUND = "authorization_request_not_found";

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
        boolean useCsrf = Boolean.parseBoolean(System.getProperty("main.useCsrf"));
        if (configProvider.getBaseConfig().getMain().isUseCsrf() && useCsrf) {
            CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
            csrfTokenRepository.setCookieName("HYDRA-XSRF-TOKEN");
            //https://docs.spring.io/spring-security/reference/5.8/migration/servlet/exploits.html#_i_am_using_angularjs_or_another_javascript_framework
            CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
            requestHandler.setCsrfRequestAttributeName(null);
            http.csrf()
                .csrfTokenRepository(csrfTokenRepository)
                .csrfTokenRequestHandler(requestHandler);
        } else {
            logger.info("CSRF is disabled");
            http.csrf().disable();
        }
        http.headers()
            .httpStrictTransportSecurity().disable()
            .frameOptions().disable();

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC || NzbHydra.isNativeBuild()) {
            http = http
                    .httpBasic()
                    .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                        @Override
                        public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                            return new HydraWebAuthenticationDetails(context);
                        }
                    })
                    .and();
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http = http
                .formLogin()
                .loginPage("/login")
                .loginProcessingUrl("/login")
                    .defaultSuccessUrl("/")
                    .permitAll()
                    .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                        @Override
                        public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                            return new HydraWebAuthenticationDetails(context);
                        }
                    })
                    .and();
        } else if (baseConfig.getAuth().getAuthType() == AuthType.OIDC) {
            ClientRegistrationRepository clientRegistrationRepository = getOidcClientRegistrationRepository(baseConfig.getAuth());
            String oidcAuthorizationUrl = "/oauth2/authorization/" + OIDC_REGISTRATION_ID;
            http = http
                    .oauth2Login()
                    .clientRegistrationRepository(clientRegistrationRepository)
                    .loginPage("/login")
                    .failureHandler((request, response, exception) -> {
                        if (isAuthorizationRequestNotFound(exception)) {
                            logger.debug("Ignoring stale OIDC callback without matching authorization request");
                            response.sendRedirect(request.getContextPath() + "/");
                            return;
                        }
                        logger.warn("OIDC login failed", exception);
                        response.sendRedirect(request.getContextPath() + "/login?error");
                    })
                    .userInfoEndpoint()
                    .oidcUserService(getOidcUserService(baseConfig.getAuth()))
                    .and()
                    .and();
            http.exceptionHandling().authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint(oidcAuthorizationUrl));
        }
        if (baseConfig.getAuth().isAuthConfigured() || NzbHydra.isNativeBuild()) {
            http = http
                    .authorizeHttpRequests()
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
                    .requestMatchers(new AntPathRequestMatcher("/static/**"))
                    .permitAll()
                .anyRequest()
//                .authenticated() //Does not include anonymous
                .hasAnyRole("ADMIN", "ANONYMOUS", "USER")
                .and()
                .logout()
                .permitAll()
                .logoutUrl("/logout")
                .logoutSuccessUrl("/")
                .deleteCookies("remember-me")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .and()
            ;
            enableAnonymousAccessIfConfigured(http);

            if (baseConfig.getAuth().isRememberUsers() && baseConfig.getAuth().getAuthType() != AuthType.OIDC) {
                int rememberMeValidityDays = configProvider.getBaseConfig().getAuth().getRememberMeValidityDays();
                if (rememberMeValidityDays == 0) {
                    rememberMeValidityDays = 1000; //Can't be disabled, three years should be enough
                }
                http = http
                    .rememberMe()
                    .alwaysRemember(true)
                    .tokenValiditySeconds(rememberMeValidityDays * SECONDS_PER_DAY)
                    .userDetailsService(userDetailsService)
                    .and();
            }

            if (baseConfig.getAuth().getAuthType() != AuthType.OIDC) {
                headerAuthenticationFilter = new HeaderAuthenticationFilter(authenticationManager, hydraUserDetailsManager, configProvider.getBaseConfig().getAuth());
                http.addFilterAfter(headerAuthenticationFilter, BasicAuthenticationFilter.class);
            }
            http.addFilterAfter(asyncSupportFilter, BasicAuthenticationFilter.class);

        } else {
            http.authorizeHttpRequests().anyRequest().permitAll();
        }
        http.exceptionHandling().accessDeniedHandler(authAndAccessEventHandler);

        http.addFilterBefore(new ForwardedForRecognizingFilter(), ChannelProcessingFilter.class);
        //We need to extract the original IP before it's removed and not retrievable anymore by the ForwardedHeaderFilter
        http.addFilterAfter(new ForwardedHeaderFilter(), ForwardedForRecognizingFilter.class);
        return http.build();
    }


    private void enableAnonymousAccessIfConfigured(HttpSecurity http) {
        //Create an anonymous auth filter. If any of the areas are not restricted the anonymous user will get its role
        try {
            if (!hydraAnonymousAuthenticationFilter.getAuthorities().isEmpty()) {
                http.anonymous().authenticationFilter(hydraAnonymousAuthenticationFilter);

                hydraAnonymousAuthenticationFilter.enable();

            }

        } catch (Exception e) {
            logger.error("Unable to configure anonymous access", e);
        }
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
        return http.getSharedObject(AuthenticationManagerBuilder.class)
            .userDetailsService(hydraUserDetailsManager)
                .passwordEncoder(passwordEncoder)
            .and()
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Create a delegating password encoder that can handle multiple formats
        // This will handle {bcrypt}, {noop}, and other standard formats
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }


}
