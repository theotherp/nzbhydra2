package org.nzbhydra.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.security.access.annotation.Secured;

import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MainWebTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private ConfigurableEnvironment environment;
    @Mock
    private UserInfosProvider userInfos;
    @Mock
    private HttpSession session;
    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private Principal principal;
    @InjectMocks
    private MainWeb testee;

    private void prepareShellRendering() {
        BaseConfig baseConfig = new BaseConfig();
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        when(userInfos.getBootstrapData(eq(principal), anyString()))
                .thenReturn(new BootstrappedDataTO());
    }

    @Test
    void shouldRenderLegacyShellByDefault() {
        prepareShellRendering();
        when(request.getCookies()).thenReturn(null);

        assertThat(testee.index(session, principal, request)).isEqualTo("index");
    }

    @Test
    void shouldRenderReactShellForSelectedDeepLink() {
        prepareShellRendering();
        when(request.getCookies()).thenReturn(new Cookie[]{new Cookie(MainWeb.UI_SELECTOR_COOKIE, "react")});

        assertThat(testee.stats(session, principal, request)).isEqualTo("react");
    }

    @Test
    void shouldSelectReactAndRedirectToDeepLinkUnderConfiguredBase() {
        when(request.getContextPath()).thenReturn("/hydra");

        assertThat(testee.selectReact(request, response, "/stats/stats?period=day")).isEqualTo("redirect:/stats/stats?period=day");

        ArgumentCaptor<Cookie> cookie = ArgumentCaptor.forClass(Cookie.class);
        verify(response).addCookie(cookie.capture());
        assertThat(cookie.getValue().getName()).isEqualTo(MainWeb.UI_SELECTOR_COOKIE);
        assertThat(cookie.getValue().getValue()).isEqualTo("react");
        assertThat(cookie.getValue().getPath()).isEqualTo("/hydra");
        assertThat(cookie.getValue().isHttpOnly()).isTrue();
        assertThat(cookie.getValue().getAttribute("SameSite")).isEqualTo("Lax");
    }

    @Test
    void shouldRejectUnsafeSelectorRedirects() {
        when(request.getContextPath()).thenReturn("/hydra");

        assertThat(testee.selectLegacy(request, response, "//attacker.example")).isEqualTo("redirect:/");
    }

    @Test
    void shouldKeepExistingRoleProtectionOnShellMappings() throws NoSuchMethodException {
        assertThat(MainWeb.class.getMethod("index", HttpSession.class, Principal.class, HttpServletRequest.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_USER");
        assertThat(MainWeb.class.getMethod("config", HttpSession.class, Principal.class, HttpServletRequest.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_ADMIN");
        assertThat(MainWeb.class.getMethod("stats", HttpSession.class, Principal.class, HttpServletRequest.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_STATS");
    }
}
