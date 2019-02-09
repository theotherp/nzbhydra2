package org.nzbhydra.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.google.common.base.Strings;
import com.google.common.hash.Hashing;
import org.bouncycastle.crypto.params.AsymmetricKeyParameter;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;
import org.bouncycastle.crypto.params.RSAKeyParameters;
import org.bouncycastle.crypto.util.PublicKeyFactory;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECParameterSpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.conscrypt.Conscrypt;
import org.conscrypt.TrustManagerImpl;
import org.conscrypt.ct.CTLogInfo;
import org.conscrypt.ct.CTLogStore;
import org.conscrypt.ct.CTPolicy;
import org.conscrypt.ct.CTVerificationResult;
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
import javax.servlet.http.HttpServletRequest;
import javax.sql.DataSource;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.net.URL;
import java.nio.file.Files;
import java.security.*;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

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

            // Configure Conscrypt to enable and enforce certificate transparencey checks
            Security.setProperty("conscrypt.ct.enable", "false");
            Security.setProperty("conscrypt.ct.enforce.*", "false");

            Security.addProvider(new BouncyCastleProvider());

            LogStore logStore = new LogStore();
            logStore.init("https://www.gstatic.com/ct/log_list/log_list.json");

            Security.insertProviderAt(Conscrypt.newProvider(), 1);

            SSLContext ctx = SSLContext.getInstance("TLS");

            KeyStore trustStore = KeyStore.getInstance("JKS");

            String javaHome = System.getenv("JAVA_HOME");
            if (Strings.isNullOrEmpty(javaHome)) {
                logger.warn("JAVA_HOME environment variable not set. Using packaged cacerts file for now");
                initializeKeystoreFromPackagedCaCertFile(trustStore);
            } else {
                File cacertFile = new File(javaHome + "/lib/security/cacerts");
                if (!cacertFile.exists()) {
                    if (javaHome.toLowerCase().contains("jdk")) {
                        javaHome = javaHome + "/jre/";
                        cacertFile = new File(javaHome + "/lib/security/cacerts");
                    }
                    if (!cacertFile.exists()) {
                        logger.warn("Unable to find file {}. Using packaged cacerts file for now", cacertFile.getAbsolutePath());
                        initializeKeystoreFromPackagedCaCertFile(trustStore);
                    } else {
                        trustStore.load(new FileInputStream(javaHome + "/lib/security/cacerts"), "changeit".toCharArray());
                    }
                } else {
                    trustStore.load(new FileInputStream(javaHome + "/lib/security/cacerts"), "changeit".toCharArray());
                }
            }

            ctx.init(null, new TrustManager[]{new TrustManagerImpl(
                    trustStore, null, null, null, logStore, null,
                    new StrictCTPolicy())}, new SecureRandom());
        } catch (Exception e) {
            logger.error("Error while initializing certificate settings", e);
        }
    }

    protected void initializeKeystoreFromPackagedCaCertFile(KeyStore trustStore) throws IOException, NoSuchAlgorithmException, CertificateException {
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
        trustStore.load(new FileInputStream(cacerts), null);
    }

    public static class StrictCTPolicy implements CTPolicy {

        @Override
        public boolean doesResultConformToPolicy(CTVerificationResult result, String hostname,
                                                 X509Certificate[] chain) {
            return !result.getValidSCTs().isEmpty() && result.getInvalidSCTs().isEmpty();
        }

    }

    public static class LogStore implements CTLogStore {
        private Map<String, CTLogInfo> logs = new HashMap<>();

        public void init(String url) throws Exception {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(new URL(url).openStream());
            ArrayNode logs = (ArrayNode) root.get("logs");

            Field field = CTLogInfo.class.getDeclaredField("logId");
            field.setAccessible(true);

            for (JsonNode log : logs) {
                String logUrl = log.get("url").asText();
                String key = log.get("key").asText();
                String description = log.get("description").asText();
                try {
                    CTLogInfo logInfo = new CTLogInfo(getKey(key), description, logUrl);
                    // reflection needed, because the CTLogInfo caculates the logID incorrectly
                    field.set(logInfo, Hashing.sha256().hashBytes(Base64.getDecoder().decode(key)).asBytes());
                    this.logs.put(Base64.getEncoder().encodeToString(logInfo.getID()), logInfo);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }

        }

        @Override
        public CTLogInfo getKnownLog(byte[] logId) {
            // using base64 form for key, as byte arrays are not fit for that
            return logs.get(Base64.getEncoder().encodeToString(logId));
        }

        private PublicKey getKey(String key) throws Exception {
            AsymmetricKeyParameter keyParams = PublicKeyFactory.createKey(Base64.getDecoder().decode(key));
            if (keyParams instanceof ECPublicKeyParameters) {
                ECPublicKeyParameters ecParams = (ECPublicKeyParameters) keyParams;
                KeyFactory eckf = KeyFactory.getInstance("EC", "BC");
                ECParameterSpec spec = new ECParameterSpec(ecParams.getParameters().getCurve(),
                        ecParams.getParameters().getG(),
                        ecParams.getParameters().getN(),
                        ecParams.getParameters().getH());

                return eckf.generatePublic(new ECPublicKeySpec(ecParams.getQ(), spec));
            } else if (keyParams instanceof RSAKeyParameters) {
                RSAKeyParameters rsaParams = (RSAKeyParameters) keyParams;
                KeyFactory rsakf = KeyFactory.getInstance("RSA", "BC");
                return rsakf.generatePublic(new RSAPublicKeySpec(rsaParams.getModulus(), rsaParams.getExponent()));
            } else {
                return null;
            }
        }
    }


}
