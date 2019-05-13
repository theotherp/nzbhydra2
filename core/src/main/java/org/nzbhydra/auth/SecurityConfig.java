package org.nzbhydra.auth;

import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.firewall.DefaultHttpFirewall;

import javax.annotation.PostConstruct;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.servlet.http.HttpServletRequest;
import javax.sql.DataSource;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;

@Configuration
@Order
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

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
    private DataSource dataSource;


    @Override
    protected void configure(HttpSecurity http) throws Exception {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        if (configProvider.getBaseConfig().getMain().isUseCsrf()) {
            http.csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
        } else {
            http.csrf().disable();
        }
        http.headers().httpStrictTransportSecurity().disable();
        http.headers().frameOptions().disable();

        if (baseConfig.getAuth().getAuthType() == AuthType.BASIC) {
            http = http
                    .httpBasic()
                    .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                        @Override
                        public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                            return new HydraWebAuthenticationDetails(context);
                        }
                    })
                    .and()
                    .logout().logoutUrl("/logout")
                    .and();
        } else if (baseConfig.getAuth().getAuthType() == AuthType.FORM) {
            http = http
                    .authorizeRequests()
                    .antMatchers("/internalapi/userinfos").permitAll()
                    .and()
                    .formLogin().loginPage("/login.html").loginProcessingUrl("/login").permitAll()
                    .authenticationDetailsSource(new WebAuthenticationDetailsSource() {
                        @Override
                        public WebAuthenticationDetails buildDetails(HttpServletRequest context) {
                            return new HydraWebAuthenticationDetails(context);
                        }
                    })
                    .and()
                    .logout().permitAll().logoutUrl("/logout").deleteCookies("rememberMe")
                    .and();
        }
        if (baseConfig.getAuth().isAuthConfigured()) {
            enableAnonymousAccessIfConfigured(http);
            if (baseConfig.getAuth().isRememberUsers()) {
                JdbcTokenRepositoryImpl tokenRepository = new JdbcTokenRepositoryImpl();
                tokenRepository.setDataSource(dataSource);
                int rememberMeValidityDays = configProvider.getBaseConfig().getAuth().getRememberMeValidityDays();
                if (rememberMeValidityDays == 0) {
                    rememberMeValidityDays = 1000; //Can't be disabled, three years should be enough
                }
                http = http.rememberMe().alwaysRemember(true).tokenValiditySeconds(rememberMeValidityDays * SECONDS_PER_DAY).tokenRepository(tokenRepository).and();
            }
            http.logout().logoutUrl("/logout").logoutSuccessUrl("/").deleteCookies("rememberMe");

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

    @Bean
    public DefaultHttpFirewall defaultHttpFirewall() {
        //Allow duplicate trailing slashes which happen when behind a reverse proxy, e.g. proxy_pass http://127.0.0.1:5076/nzbhydra2/;
        return new DefaultHttpFirewall();
    }

    @Override
    public void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(hydraUserDetailsManager);
    }


    @PostConstruct
    public void usePackagedCaCerts() {
        //Use packaged CA certs file because in some cases it might be missing. Also allows to keep this updated
        try {
            if (!configProvider.getBaseConfig().getMain().isUsePackagedCaCerts()) {
                return;
            }
            logger.debug("Using packaged cacerts file");

            File cacerts = new File(NzbHydra.getDataFolder(), "cacerts");
            if (cacerts.exists()) {
                //Overwrite, might be older
                boolean deleted = cacerts.delete();
                if (!deleted) {
                    logger.warn("Unable to delete old cacerts file {}", cacerts.getAbsolutePath());
                }
            }
            if (!cacerts.exists()) {
                Files.copy(NzbHydra.class.getResource("/cacerts").openStream(), cacerts.toPath());
            }
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            KeyStore keystore = KeyStore.getInstance(KeyStore.getDefaultType());
            InputStream keystoreStream = NzbHydra.class.getResource("/cacerts").openStream();
            keystore.load(keystoreStream, null);
            trustManagerFactory.init(keystore);
            TrustManager[] trustManagers = trustManagerFactory.getTrustManagers();
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustManagers, null);
            SSLContext.setDefault(sc);
        } catch (IOException | KeyStoreException | CertificateException | NoSuchAlgorithmException | KeyManagementException e) {
            logger.error("Unable to write packaged cacerts file", e);
        }
    }


}
