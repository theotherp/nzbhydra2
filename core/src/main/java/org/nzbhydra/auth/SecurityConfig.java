package org.nzbhydra.auth;

import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.channel.ChannelProcessingFilter;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.firewall.DefaultHttpFirewall;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.filter.ForwardedHeaderFilter;

@Configuration
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

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC) {
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
        }
        if (baseConfig.getAuth().isAuthConfigured()) {
            http = http
                .authorizeHttpRequests()
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

            if (baseConfig.getAuth().isRememberUsers()) {
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

            headerAuthenticationFilter = new HeaderAuthenticationFilter(authenticationManager, hydraUserDetailsManager, configProvider.getBaseConfig().getAuth());
            http.addFilterAfter(headerAuthenticationFilter, BasicAuthenticationFilter.class);
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
    public AuthenticationManager authManager(HttpSecurity http)
        throws Exception {
        return http.getSharedObject(AuthenticationManagerBuilder.class)
            .userDetailsService(hydraUserDetailsManager)
            .and()
            .build();
    }


}
