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
 */
class OidcAuthenticationEntryPointTest {

    private static final String AUTHORIZATION_URL = "/oauth2/authorization/nzbhydra2";
    private static final String NAVIGATION_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    private final OidcAuthenticationEntryPoint testee = new OidcAuthenticationEntryPoint(AUTHORIZATION_URL);

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
