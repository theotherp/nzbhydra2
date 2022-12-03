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
        if (configProvider.getBaseConfig().getMain().isUseCsrf()) {
            CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
            csrfTokenRepository.setCookieName("HYDRA-XSRF-TOKEN");
            http.csrf().csrfTokenRepository(csrfTokenRepository);
        } else {
            http.csrf().disable();
        }
        http.headers().httpStrictTransportSecurity().disable();
        http.headers().frameOptions().disable();

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC) {
            http = http
                .authorizeHttpRequests()
                .requestMatchers("/internalapi/userinfos").permitAll()
                .and()
                .httpBasic()
                .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                    @Override
                    public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                        return new HydraWebAuthenticationDetails(context);
                    }
                })
                .and()
                .logout().logoutUrl("/logout").deleteCookies("remember-me")
                .and();
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http = http
                .authorizeHttpRequests()
                .requestMatchers("/internalapi/userinfos").permitAll()
                .and()
                .formLogin().loginPage("/login").loginProcessingUrl("/login").defaultSuccessUrl("/").permitAll()
                .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                    @Override
                    public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                        return new HydraWebAuthenticationDetails(context);
                    }
                })
                .and()
                .logout().permitAll().logoutUrl("/logout").logoutSuccessUrl("/loggedout").logoutSuccessUrl("/").deleteCookies("remember-me")
                .and();
        }
        if (baseConfig.getAuth().isAuthConfigured()) {
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
            http.authorizeHttpRequests()
                .requestMatchers("/actuator/**")
                .hasRole("ADMIN")
                .anyRequest().permitAll();
            http.authorizeHttpRequests()
                .requestMatchers(new AntPathRequestMatcher("/static/**"))
                .permitAll();
            headerAuthenticationFilter = new HeaderAuthenticationFilter(authenticationManager, hydraUserDetailsManager, configProvider.getBaseConfig().getAuth());
            http.addFilterAfter(headerAuthenticationFilter, BasicAuthenticationFilter.class);
            http.addFilterAfter(asyncSupportFilter, BasicAuthenticationFilter.class);

            http.exceptionHandling().accessDeniedHandler(authAndAccessEventHandler);
        } else {
            http.authorizeHttpRequests().anyRequest().permitAll();
        }

        http.addFilterBefore(new ForwardedForRecognizingFilter(), ChannelProcessingFilter.class);
        //We need to extract the original IP before it's removed and not retrievable anymore by the ForwardedHeaderFilter
        http.addFilterAfter(new ForwardedHeaderFilter(), ForwardedForRecognizingFilter.class);
        return http.build();
    }

//
//    @Bean
//    public WebSecurityCustomizer webSecurityCustomizer() {
//        return (web) -> {
//            web.pe
//            web.ignoring().requestMatchers(new AntPathRequestMatcher("/static/**"));
//        };
//    }

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

    // TODO spring 01.11.2022: What to do?
//    @Bean(name = BeanIds.AUTHENTICATION_MANAGER)
//    @Override
//    public AuthenticationManager authenticationManagerBean() throws Exception {
//        return super.authenticationManagerBean();
//    }

    @Bean
    public DefaultHttpFirewall defaultHttpFirewall() {
        //Allow duplicate trailing slashes which happen when behind a reverse proxy, e.g. proxy_pass http://127.0.0.1:5076/nzbhydra2/;
        return new DefaultHttpFirewall();
    }

    // TODO spring 01.11.2022: What to do?
//    @Override
//    public void configure(AuthenticationManagerBuilder auth) throws Exception {
//        auth.userDetailsService(hydraUserDetailsManager);
//}

    @Bean
    public AuthenticationManager authManager(HttpSecurity http)
        throws Exception {
        return http.getSharedObject(AuthenticationManagerBuilder.class)
            .userDetailsService(hydraUserDetailsManager)
            .and()
            .build();
    }


}
