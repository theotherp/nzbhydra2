package org.nzbhydra.auth;

import org.aopalliance.intercept.MethodInvocation;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class HydraGlobalMethodSecurityConfigurationTest {

    @Test
    public void shouldApplySecuredRolesWhenAuthenticationIsConfigured() throws NoSuchMethodException {
        ConfigProvider configProvider = mock(ConfigProvider.class);
        BaseConfig config = new BaseConfig();
        config.getAuth().setAuthType(AuthType.BASIC);
        when(configProvider.getBaseConfig()).thenReturn(config);
        MethodInvocation invocation = mock(MethodInvocation.class);
        when(invocation.getMethod()).thenReturn(SecuredEndpoint.class.getMethod("admin"));
        var interceptor = new HydraGlobalMethodSecurityConfiguration(configProvider).securedMethodInterceptor();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user", "password", AuthorityUtils.createAuthorityList("ROLE_USER")));

        try {
            assertThatThrownBy(() -> interceptor.invoke(invocation)).isInstanceOf(AccessDeniedException.class);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static class SecuredEndpoint {

        @Secured("ROLE_ADMIN")
        public void admin() {
        }
    }
}
