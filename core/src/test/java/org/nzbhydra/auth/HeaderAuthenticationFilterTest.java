package org.nzbhydra.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class HeaderAuthenticationFilterTest {

    @Test
    public void shouldCreateAuthenticatedAdminForCorrectInternalApiKey() throws Exception {
        String originalKey = System.getProperty("internalApiKey");
        System.setProperty("internalApiKey", "test-internal-key");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getParameterValues("internalApiKey")).thenReturn(new String[]{"test-internal-key"});

        try {
            HeaderAuthenticationFilter filter = new HeaderAuthenticationFilter(mock(AuthenticationManager.class),
                    new HydraUserDetailsManager(new BaseConfig()), new BaseConfig().getAuth());
            filter.doFilter(request, mock(HttpServletResponse.class), mock(FilterChain.class));

            assertThat(SecurityContextHolder.getContext().getAuthentication())
                    .isNotInstanceOf(AnonymousAuthenticationToken.class)
                    .isNotNull();
            assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                    .extracting(authority -> authority.getAuthority())
                    .containsExactly("ROLE_ADMIN");
        } finally {
            SecurityContextHolder.clearContext();
            if (originalKey == null) {
                System.clearProperty("internalApiKey");
            } else {
                System.setProperty("internalApiKey", originalKey);
            }
        }
    }
}
