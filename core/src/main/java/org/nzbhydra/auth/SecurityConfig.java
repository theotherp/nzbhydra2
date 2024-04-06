package org.nzbhydra.auth;

import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.channel.ChannelProcessingFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.web.filter.ForwardedHeaderFilter;

@Configuration(proxyBeanMethods = false)
@Order
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);
    private static final int SECONDS_PER_DAY = 60 * 60 * 24;

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
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        boolean useCsrf = Boolean.parseBoolean(System.getProperty("main.useCsrf"));
        if (configProvider.getBaseConfig().getMain().isUseCsrf() && useCsrf) {
            CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
            csrfTokenRepository.setCookieName("HYDRA-XSRF-TOKEN");
            //https://docs.spring.io/spring-security/reference/5.8/migration/servlet/exploits.html#_i_am_using_angularjs_or_another_javascript_framework
            CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
            requestHandler.setCsrfRequestAttributeName(null);
            http.csrf(configurer -> configurer.csrfTokenRepository(csrfTokenRepository)
                    .csrfTokenRequestHandler(requestHandler));

        } else {
            logger.info("CSRF is disabled");
            http.csrf(AbstractHttpConfigurer::disable);
        }
        http
                .headers(customizer -> customizer.httpStrictTransportSecurity(HeadersConfigurer.HstsConfig::disable)
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::disable));

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC || NzbHydra.isNativeBuild()) {
            http.httpBasic(httpBasic -> {
                if (baseConfig.getAuth().getAuthType() == AuthType.BASIC || NzbHydra.isNativeBuild()) {
                    httpBasic.authenticationDetailsSource(HydraWebAuthenticationDetails::new);
                }
            });
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http.formLogin(formLogin -> {
                formLogin.loginPage("/login")
                        .loginProcessingUrl("/login")
                        .defaultSuccessUrl("/")
                        .permitAll()
                        .authenticationDetailsSource(HydraWebAuthenticationDetails::new);
            });
        }
        http.authorizeHttpRequests(customizer -> customizer.requestMatchers("/actuator/health/ping").permitAll());
        if (baseConfig.getAuth().isAuthConfigured() || NzbHydra.isNativeBuild()) {
            http.authorizeHttpRequests(authorizeRequests -> {
                        authorizeRequests
                                .requestMatchers("/internalapi/").authenticated()
                                .requestMatchers("/websocket/").authenticated()
                                .requestMatchers("/actuator/**").hasRole("ADMIN")
                                .requestMatchers("/static/**").permitAll()
                                .anyRequest().hasAnyRole("ADMIN", "ANONYMOUS", "USER");


                    })
                    .logout(customizer -> {
                        if (baseConfig.getAuth().isAuthConfigured() || NzbHydra.isNativeBuild()) {
                            customizer
                                    .permitAll()
                                    .logoutUrl("/logout")
                                    .logoutSuccessUrl("/")
                                    .deleteCookies("remember-me")
                                    .invalidateHttpSession(true)
                                    .clearAuthentication(true);
                        }
                    });
            if (!hydraAnonymousAuthenticationFilter.getAuthorities().isEmpty()) {
                http.anonymous(customizer -> {
                    try {
                        //Create an anonymous auth filter. If any of the areas are not restricted the anonymous user will get its role
                        customizer.authenticationFilter(hydraAnonymousAuthenticationFilter);
                        hydraAnonymousAuthenticationFilter.enable();
                    } catch (Exception e) {
                        logger.error("Unable to configure anonymous access", e);
                    }
                });
            }
            if (baseConfig.getAuth().isRememberUsers()) {
                http.rememberMe(customizer -> {
                    if (baseConfig.getAuth().isRememberUsers()) {
                        int rememberMeValidityDays = configProvider.getBaseConfig().getAuth().getRememberMeValidityDays();
                        if (rememberMeValidityDays == 0) {
                            rememberMeValidityDays = 1000; //Can't be disabled, three years should be enough
                        }
                        customizer
                                .alwaysRemember(true)
                                .tokenValiditySeconds(rememberMeValidityDays * SECONDS_PER_DAY)
                                .userDetailsService(userDetailsService);
                    }
                });
            }
            headerAuthenticationFilter = new HeaderAuthenticationFilter(hydraUserDetailsManager, configProvider.getBaseConfig().getAuth());
            http.addFilterAfter(headerAuthenticationFilter, BasicAuthenticationFilter.class);
            http.addFilterAfter(asyncSupportFilter, BasicAuthenticationFilter.class);
        } else {
            http.authorizeHttpRequests(customizer -> customizer.anyRequest().permitAll());
        }
        http.exceptionHandling(customizer -> customizer.accessDeniedHandler(authAndAccessEventHandler))
                .userDetailsService(hydraUserDetailsManager);

        http.addFilterBefore(new ForwardedForRecognizingFilter(), ChannelProcessingFilter.class);
        //We need to extract the original IP before it's removed and not retrievable anymore by the ForwardedHeaderFilter
        http.addFilterAfter(new ForwardedHeaderFilter(), ForwardedForRecognizingFilter.class);

        return http.build();
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


}
