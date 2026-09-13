

package org.nzbhydra.auth;

import org.aopalliance.intercept.MethodInvocation;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.authorization.method.SecuredAuthorizationManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;


/**
 * Provides the {@code @Secured} advisor, which the auto-proxy creator collects while it processes the very first beans,
 * including other {@link org.springframework.beans.factory.config.BeanPostProcessor}s. Everything this class needs at
 * construction time is created at that moment and skips proxying (Spring warns per bean), so the config is resolved
 * lazily on each authorization instead of injected, and the class is marked as infrastructure like the advisor it
 * declares.
 */
@EnableMethodSecurity(prePostEnabled = false, securedEnabled = false)
@Configuration(proxyBeanMethods = false)
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class HydraGlobalMethodSecurityConfiguration {

    private final ObjectProvider<ConfigProvider> configProvider;

    public HydraGlobalMethodSecurityConfiguration(ObjectProvider<ConfigProvider> configProvider) {
        this.configProvider = configProvider;
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    public AuthorizationManagerBeforeMethodInterceptor securedMethodInterceptor() {
        SecuredAuthorizationManager securedAuthorizationManager = new SecuredAuthorizationManager();
        AuthorizationManager<MethodInvocation> authorizationManager = (authentication, invocation) -> {
            AuthType authType = configProvider.getObject().getBaseConfig().getAuth().getAuthType();
            if (authType == AuthType.NONE && !NzbHydra.isNativeBuild()) {
                return new AuthorizationDecision(true);
            }
            return securedAuthorizationManager.authorize(authentication, invocation);
        };
        return AuthorizationManagerBeforeMethodInterceptor.secured(authorizationManager);
    }
}
