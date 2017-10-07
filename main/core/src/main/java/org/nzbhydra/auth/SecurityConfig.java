package org.nzbhydra.auth;

import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.jdbc.DataSourceBuilder;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.BeanIds;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import javax.sql.DataSource;

@Configuration
@Order(SecurityProperties.ACCESS_OVERRIDE_ORDER)
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private HydraAnonymousAuthenticationFilter hydraAnonymousAuthenticationFilter;
    @Autowired
    private HydraUserDetailsManager hydraUserDetailsManager;
    @Autowired
    private AuthAndAccessEventHandler authAndAccessEventHandler;;

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        if (configProvider.getBaseConfig().getMain().isUseCsrf()) {
            http.csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
        } else {
            http.csrf().disable();
        }

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC) {
            http = http
                    .httpBasic()
                    .and()
                    .logout().logoutUrl("/logout")
                    .and();
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http = http
                    .authorizeRequests()
//                    .antMatchers("/").permitAll()
                    .antMatchers("/internalapi/userinfos").permitAll()
                    //.anyRequest().authenticated()
                    .and()
                    .formLogin().loginPage("/login.html").loginProcessingUrl("/login").permitAll()
                    .and()
                    .logout().permitAll().logoutUrl("/logout").deleteCookies("remember-me")
                    .and();
        }
        if (baseConfig.getAuth().isAuthConfigured()) {
            enableAnonymousAccessIfConfigured(http);
            if (baseConfig.getAuth().isRememberUsers()) {
                JdbcTokenRepositoryImpl tokenRepository = new JdbcTokenRepositoryImpl();
                tokenRepository.setDataSource(dataSource());
                http = http.rememberMe().alwaysRemember(true).tokenRepository(tokenRepository).and();
            }
            http.logout().logoutUrl("/logout").logoutSuccessUrl("/").deleteCookies("remember-me");

        }
        http.exceptionHandling().accessDeniedHandler(authAndAccessEventHandler);
    }

    @Override
    public void configure(WebSecurity web) throws Exception {
        web.ignoring().antMatchers("/static/**");
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

    @Bean(name = BeanIds.AUTHENTICATION_MANAGER)
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }


    @Override
    public void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(hydraUserDetailsManager);
    }

    @ConfigurationProperties(prefix = "spring.datasource")
    @Bean
    public DataSource dataSource() {
        return DataSourceBuilder
                .create()
                .build();
    }


}
