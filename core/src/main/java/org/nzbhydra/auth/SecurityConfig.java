package org.nzbhydra.auth;

import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.UserAuthConfig;
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
import org.springframework.security.config.annotation.authentication.configurers.provisioning.InMemoryUserDetailsManagerConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.web.authentication.rememberme.InMemoryTokenRepositoryImpl;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;

@Configuration
@Order(SecurityProperties.ACCESS_OVERRIDE_ORDER)
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Autowired
    private BaseConfig baseConfig;


    @Override
    protected void configure(HttpSecurity http) throws Exception {


        http.csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC) {
            http = http
                    .httpBasic()
                    .and()
            ;
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http = http.formLogin().loginPage("/login").permitAll()
                    .and()
                    .formLogin().loginPage("/login").and();
        }
        if (baseConfig.getAuth().isAuthConfigured()) {
            enableAnonymousAccessIfConfigured(http);
            if (baseConfig.getAuth().isRememberUsers()) {
                JdbcTokenRepositoryImpl tokenRepository = new JdbcTokenRepositoryImpl();
                tokenRepository.setCreateTableOnStartup(true);
                tokenRepository.setDataSource(dataSource());
                http = http.rememberMe().alwaysRemember(true).tokenRepository(new InMemoryTokenRepositoryImpl()).and();
            }
            http.logout().logoutUrl("/logout").logoutSuccessUrl("/").deleteCookies("remember-me");
        }
    }

    private void enableAnonymousAccessIfConfigured(HttpSecurity http) {
        List<String> anonymousUserRules = new ArrayList<>();
        if (!baseConfig.getAuth().isRestrictSearch()) {
            anonymousUserRules.add("ROLE_USER");
            logger.info("Granting basic user rights to anonymous users");
        }
        if (!baseConfig.getAuth().isRestrictStats()) {
            anonymousUserRules.add("ROLE_STATS");
            logger.info("Granting stats rights to anonymous users");
        }
        if (!baseConfig.getAuth().isRestrictAdmin()) {
            anonymousUserRules.add("ROLE_ADMIN");
            logger.info("Granting admin rights to anonymous users");
        }
        if (!anonymousUserRules.isEmpty()) {
            anonymousUserRules.add("ROLE_ANONYMOUS");
            http.addFilter(new HydraAnonymousAuthenticationFilter(anonymousUserRules));
        }
    }

    @Bean(name = BeanIds.AUTHENTICATION_MANAGER)
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }


    @Override
    public void configure(AuthenticationManagerBuilder auth) throws Exception {
        //Chaining the user configurations is important because otherwise multiple configurers will exist and cause remember-me to fail
        InMemoryUserDetailsManagerConfigurer<AuthenticationManagerBuilder> configurer = auth.inMemoryAuthentication();
        for (UserAuthConfig userAuthConfig : baseConfig.getAuth().getUsers()) {
            //Add roles either if it's actively assigned to him or if the right isn't restricted at all
            List<String> userRoles = new ArrayList<>();
            if (userAuthConfig.isMaySeeAdmin() || !baseConfig.getAuth().isRestrictAdmin()) {
                userRoles.add("ADMIN");
            }
            if (userAuthConfig.isMaySeeStats() || !baseConfig.getAuth().isRestrictStats()) {
                userRoles.add("STATS");
            }
            if (userAuthConfig.isMaySeeDetailsDl() || !baseConfig.getAuth().isRestrictDetailsDl()) {
                userRoles.add("DETAILS");
            }
            if (userAuthConfig.isShowIndexerSelection() || !baseConfig.getAuth().isRestrictIndexerSelection()) {
                userRoles.add("SHOW_INDEXERS");
            }
            userRoles.add("USER");
            configurer = configurer.withUser(userAuthConfig.getUsername()).password(userAuthConfig.getPassword()).roles(userRoles.toArray(new String[userRoles.size()])).and();
        }

    }

    @ConfigurationProperties(prefix = "spring.datasource")
    @Bean
    public DataSource dataSource() {
        return DataSourceBuilder
                .create()
                .build();
    }


}
