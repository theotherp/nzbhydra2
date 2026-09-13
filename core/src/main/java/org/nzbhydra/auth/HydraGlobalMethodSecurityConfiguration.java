

package org.nzbhydra.auth;

import org.aopalliance.intercept.MethodInvocation;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.authorization.method.SecuredAuthorizationManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;


@EnableMethodSecurity(prePostEnabled = false, securedEnabled = false)
@Configuration(proxyBeanMethods = false)
public class HydraGlobalMethodSecurityConfiguration {

    private final ConfigProvider configProvider;

    public HydraGlobalMethodSecurityConfiguration(ConfigProvider configProvider) {
        this.configProvider = configProvider;
    }

    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    public AuthorizationManagerBeforeMethodInterceptor securedMethodInterceptor() {
        SecuredAuthorizationManager securedAuthorizationManager = new SecuredAuthorizationManager();
        AuthorizationManager<MethodInvocation> authorizationManager = (authentication, invocation) -> {
            AuthType authType = configProvider.getBaseConfig().getAuth().getAuthType();
            if (authType == AuthType.NONE && !NzbHydra.isNativeBuild()) {
                return new AuthorizationDecision(true);
            }
            return securedAuthorizationManager.authorize(authentication, invocation);
        };
        return AuthorizationManagerBeforeMethodInterceptor.secured(authorizationManager);
    }
}
