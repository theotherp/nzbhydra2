package org.nzbhydra.auth;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test for #1080: with an expired OIDC session a background request (e.g. the UI polling
 * /internalapi/indexerstatuses) must get a 401 instead of a redirect into the cross-origin OIDC authorization flow,
 * which the browser cannot complete for an XHR / fetch call.
 * <p>
 * The FORM login uses the same entry point, for a different reason: /login answers 200 with the web UI's document, so
 * a fetch that follows the redirect gets a successful response full of HTML instead of a refusal.
 */
class BackgroundRequestAuthenticationEntryPointTest {

    private static final String AUTHORIZATION_URL = "/oauth2/authorization/nzbhydra2";
    private static final String LOGIN_URL = "/login";
    private static final String NAVIGATION_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    private final BackgroundRequestAuthenticationEntryPoint testee = new BackgroundRequestAuthenticationEntryPoint(AUTHORIZATION_URL);

    @Test
    void shouldAnswerInternalApiRequestsWith401InsteadOfRedirecting() throws IOException, ServletException {
        MockHttpServletRequest request = backgroundRequest("/internalapi/indexerstatuses");
        MockHttpServletResponse response = new MockHttpServletResponse();

        testee.commence(request, response, new InsufficientAuthenticationException("not authenticated"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getRedirectedUrl()).isNull();
    }

    @Test
    void shouldRecognizeInternalApiRequestsBehindAContextPath() throws IOException, ServletException {
        MockHttpServletRequest request = backgroundRequest("/nzbhydra2/internalapi/history/downloads");
        request.setContextPath("/nzbhydra2");
        MockHttpServletRequest navigation = navigationRequest("/nzbhydra2/");
        navigation.setContextPath("/nzbhydra2");
        MockHttpServletResponse response = new MockHttpServletResponse();

        testee.commence(request, response, new InsufficientAuthenticationException("not authenticated"));

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void shouldAnswerJsonRequestsOutsideInternalApiWith401() throws IOException, ServletException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/somejsonendpoint");
        request.addHeader("Accept", "application/json, text/plain, */*");
        MockHttpServletResponse response = new MockHttpServletResponse();

        testee.commence(request, response, new InsufficientAuthenticationException("not authenticated"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getRedirectedUrl()).isNull();
    }

    @Test
    void shouldRedirectBrowserNavigationsIntoTheOidcFlow() throws IOException, ServletException {
        MockHttpServletRequest request = navigationRequest("/");
        MockHttpServletResponse response = new MockHttpServletResponse();

        testee.commence(request, response, new InsufficientAuthenticationException("not authenticated"));

        assertThat(response.getStatus()).isEqualTo(302);
        assertThat(response.getRedirectedUrl()).isEqualTo(AUTHORIZATION_URL);
    }

    @Test
    void shouldAnswerAFormLoginsBackgroundRequestWith401() throws IOException, ServletException {
        //The welcome flag the UI reads on every start. Redirected, it came back as 200 plus the login page's HTML,
        //which the UI read as "not shown yet" and greeted the user again on every login screen
        BackgroundRequestAuthenticationEntryPoint formEntryPoint = new BackgroundRequestAuthenticationEntryPoint(LOGIN_URL);
        //Exactly what the React transport sends (ApiTransport.request), rather than the AngularJS spelling the older
        //cases above use
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internalapi/welcomeshown");
        request.addHeader("Accept", "application/json");
        MockHttpServletResponse response = new MockHttpServletResponse();

        formEntryPoint.commence(request, response, new InsufficientAuthenticationException("not authenticated"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getRedirectedUrl()).isNull();
    }

    @Test
    void shouldRedirectABrowserNavigationToTheFormLoginPage() throws IOException, ServletException {
        BackgroundRequestAuthenticationEntryPoint formEntryPoint = new BackgroundRequestAuthenticationEntryPoint(LOGIN_URL);
        MockHttpServletRequest request = navigationRequest("/");
        MockHttpServletResponse response = new MockHttpServletResponse();

        formEntryPoint.commence(request, response, new InsufficientAuthenticationException("not authenticated"));

        assertThat(response.getStatus()).isEqualTo(302);
        assertThat(response.getRedirectedUrl()).isEqualTo(LOGIN_URL);
    }

    private MockHttpServletRequest backgroundRequest(String requestUri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", requestUri);
        request.addHeader("Accept", "application/json, text/plain, */*");
        return request;
    }

    private MockHttpServletRequest navigationRequest(String requestUri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", requestUri);
        request.addHeader("Accept", NAVIGATION_ACCEPT);
        return request;
    }
}
