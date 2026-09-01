package org.nzbhydra.auth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;

import java.io.IOException;

/**
 * Entry point for OIDC: browser navigations are redirected into the OIDC authorization flow, but background requests
 * (XHR / fetch calls, e.g. from the web UI to /internalapi) get a plain 401 instead.
 * <p>
 * Redirecting a background request into the authorization flow cannot work: the browser follows the redirect to the
 * cross-origin identity provider, which fails (the frontend sees a network error with status -1 / a failed fetch), and
 * every concurrently failing request starts its own authorization attempt, of which the identity provider can only
 * complete one (see #1080). With a 401 the frontend can tell the user that the session expired and that a reload is
 * needed; the reload is a proper navigation which completes the OIDC flow.
 */
public class OidcAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final LoginUrlAuthenticationEntryPoint redirectingEntryPoint;

    public OidcAuthenticationEntryPoint(String oidcAuthorizationUrl) {
        this.redirectingEntryPoint = new LoginUrlAuthenticationEntryPoint(oidcAuthorizationUrl);
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        if (isBackgroundRequest(request)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        redirectingEntryPoint.commence(request, response, authException);
    }

    static boolean isBackgroundRequest(HttpServletRequest request) {
        String path = pathWithinApplication(request);
        if (path.startsWith("/internalapi/") || path.startsWith("/websocket/")) {
            return true;
        }
        //Both the AngularJS and the React UI request JSON; a browser navigation asks for text/html
        String accept = request.getHeader("Accept");
        if (accept != null && accept.contains("application/json")) {
            return true;
        }
        return "XMLHttpRequest".equals(request.getHeader("X-Requested-With"));
    }

    private static String pathWithinApplication(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
            return uri.substring(contextPath.length());
        }
        return uri;
    }
}
