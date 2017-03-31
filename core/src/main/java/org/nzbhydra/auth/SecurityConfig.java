package org.nzbhydra.auth;

import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.UserAuthConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.BeanIds;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.authentication.configurers.provisioning.UserDetailsManagerConfigurer.UserDetailsBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import java.util.ArrayList;
import java.util.List;

@Configuration
@Order(SecurityProperties.ACCESS_OVERRIDE_ORDER)
@EnableWebSecurity
//@EnableGlobalMethodSecurity(securedEnabled = true)
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Autowired
    private BaseConfig baseConfig;


    @Override
    protected void configure(HttpSecurity http) throws Exception {

//                .authorizeRequests().antMatchers("/config/**", "/internalapi/config/**").hasRole("ADMIN")
//                .and()
//                .exceptionHandling().authenticationEntryPoint(new AuthEndPoint())
//                .and()
//                .authorizeRequests().antMatchers("/**").hasRole("USER")
//                .and()
        //.authorizeRequests().anyRequest().permitAll()
//                .and()
        http
                .csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC) {
            http.httpBasic();
            http.addFilter(new AfterBasicAuthFilter(authenticationManagerBean()));
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http.formLogin().loginPage("/login").permitAll().and().logout().permitAll();
            http.authorizeRequests().and().formLogin().loginPage("/login");


            //http.addFilterAfter(afterBasicAuthFilter, BasicAuthenticationFilter.class);
        }


    }

    @Bean(name = BeanIds.AUTHENTICATION_MANAGER)
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }


    @Override
    public void configure(AuthenticationManagerBuilder auth) throws Exception {

        for (UserAuthConfig userAuthConfig : baseConfig.getAuth().getUsers()) {
            UserDetailsBuilder userDetailsBuilder = auth.inMemoryAuthentication().withUser(userAuthConfig.getUsername()).password(userAuthConfig.getPassword());
            List<String> userRoles = new ArrayList<>();
            if (userAuthConfig.isMaySeeAdmin()) {
                userRoles.add("ADMIN");
            }
            if (userAuthConfig.isMaySeeAdmin()) {
                userRoles.add("STATS");
            }
            if (userAuthConfig.isMaySeeDetailsDl()) {
                userRoles.add("DETAILS");
            }
            if (userAuthConfig.isShowIndexerSelection()) {
                userRoles.add("SHOW_INDEXERS");
            }
            userRoles.add("USER");
            userDetailsBuilder.roles(userRoles.toArray(new String[userRoles.size()]));

        }

    }


}
