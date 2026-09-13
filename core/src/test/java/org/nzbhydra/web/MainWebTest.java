package org.nzbhydra.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.auth.UserInfosProvider;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.security.access.annotation.Secured;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.security.Principal;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@ExtendWith(MockitoExtension.class)
class MainWebTest {

    @Mock
    private ConfigurableEnvironment environment;
    @Mock
    private UserInfosProvider userInfos;
    @Mock
    private HttpSession session;
    @Mock
    private HttpServletResponse response;
    @Mock
    private Principal principal;
    @InjectMocks
    private MainWeb testee;

    private void prepareShellRendering() {
        when(userInfos.getBootstrapData(any(), anyString())).thenReturn(new BootstrappedDataTO());
    }

    @Test
    void shouldRenderReactShellForEveryShellMapping() {
        prepareShellRendering();

        assertThat(testee.index(session, principal)).isEqualTo("react");
        assertThat(testee.config(session, principal)).isEqualTo("react");
        assertThat(testee.system(session, principal)).isEqualTo("react");
        assertThat(testee.stats(session, principal)).isEqualTo("react");
        assertThat(testee.index2(session, principal)).isEqualTo("react");
    }

    /**
     * FM-095: the selector is gone, but a browser that used it before the removal keeps sending the cookie
     * it wrote. Driven through a real dispatch (not a direct call) so the cookie is actually presented on
     * the request, including the value that used to select the deleted shell.
     */
    @Test
    void shouldServeReactForARequestStillCarryingAStaleSelectorCookie() throws Exception {
        prepareShellRendering();
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(testee).build();

        for (String staleValue : Arrays.asList("legacy", "react", "something-else")) {
            mockMvc.perform(get("/").cookie(new Cookie("nzbhydra-ui", staleValue)))
                    .andExpect(view().name("react"));
            mockMvc.perform(get("/config/main").cookie(new Cookie("nzbhydra-ui", staleValue)))
                    .andExpect(view().name("react"));
            mockMvc.perform(get("/system/tasks").cookie(new Cookie("nzbhydra-ui", staleValue)))
                    .andExpect(view().name("react"));
            mockMvc.perform(get("/stats/stats").cookie(new Cookie("nzbhydra-ui", staleValue)))
                    .andExpect(view().name("react"));
            mockMvc.perform(get("/login").cookie(new Cookie("nzbhydra-ui", staleValue)))
                    .andExpect(view().name("react"));
        }
    }

    /**
     * The selector endpoints themselves must be gone, not merely unreferenced: a returning bookmark of
     * either one has to 404 rather than write a cookie nothing reads.
     */
    @Test
    void shouldNoLongerMapTheSelectorEndpoints() {
        assertThat(Arrays.stream(MainWeb.class.getDeclaredMethods())
                .flatMap(method -> Arrays.stream(method.getAnnotations()))
                .map(Object::toString))
                .noneMatch(annotation -> annotation.contains("/ui/"));

        assertThat(Arrays.stream(MainWeb.class.getDeclaredMethods()).map(Method::getName))
                .doesNotContain("selectReact", "selectLegacy", "selectUi", "isReactSelected", "shell", "safeRedirectPath");
        assertThat(Arrays.stream(MainWeb.class.getDeclaredFields()).map(Field::getName))
                .doesNotContain("UI_SELECTOR_COOKIE", "LEGACY_UI", "UI_SELECTOR_MAX_AGE_SECONDS");
    }

    /**
     * FM-094 left both flows rendering legacy's {@code index} template; FM-095 deletes that template, so
     * rendering anything but {@code react} would make logging out resolve a view that no longer exists.
     */
    @Test
    void shouldRenderReactShellForTheLogoutFlows() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(testee).build();

        mockMvc.perform(post("/logout")).andExpect(view().name("react"));
        mockMvc.perform(post("/loggedout")).andExpect(view().name("react"));
    }

    @Test
    void shouldInvalidateTheSessionOnlyAfterALogout() {
        assertThat(testee.logout(session, principal, response)).isEqualTo("react");
        verify(session).setAttribute("LOGGEDOUT", true);
        verify(session, never()).invalidate();

        when(session.getAttribute("LOGGEDOUT")).thenReturn(true);
        assertThat(testee.loggedOut(session, principal, response)).isEqualTo("react");
        verify(session).invalidate();
        verify(response).setStatus(401);
    }

    /**
     * The bootstrap contract the React shell reads. {@code cssUrl} and {@code disableBlockUi} were legacy
     * shell inputs only and must not be written any more.
     */
    @Test
    void shouldWriteOnlyTheBootstrapContractIntoTheSession() {
        BootstrappedDataTO bootstrappedData = new BootstrappedDataTO();
        when(environment.getProperty("server.servlet.context-path")).thenReturn("/hydra");
        when(userInfos.getBootstrapData(principal, "/hydra/")).thenReturn(bootstrappedData);

        assertThat(testee.index(session, principal)).isEqualTo("react");

        verify(session).setAttribute("baseUrl", "/hydra/");
        verify(session).setAttribute("bootstrap", bootstrappedData);
        verify(session, never()).setAttribute(eq("cssUrl"), any());
        verify(session, never()).setAttribute(eq("disableBlockUi"), any());
    }

    @Test
    void shouldKeepExistingRoleProtectionOnShellMappings() throws NoSuchMethodException {
        assertThat(MainWeb.class.getMethod("index", HttpSession.class, Principal.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_USER");
        assertThat(MainWeb.class.getMethod("config", HttpSession.class, Principal.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_ADMIN");
        assertThat(MainWeb.class.getMethod("system", HttpSession.class, Principal.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_ADMIN");
        assertThat(MainWeb.class.getMethod("stats", HttpSession.class, Principal.class)
                .getAnnotation(Secured.class).value()).containsExactly("ROLE_STATS");
    }
}
