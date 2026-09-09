package org.nzbhydra.externalapi;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.auth.HydraWebAuthenticationDetails;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * The only way into {@code /externalapi/**}. The configured API key ({@code main.apiKey}) is taken from the
 * {@value #API_KEY_HEADER} header or, if that is absent, from the {@value #API_KEY_PARAMETER} query parameter - the
 * same name and value {@code /api} uses.
 *
 * <p>A request with the right key gets an authenticated token for {@value #PRINCIPAL} with {@code ROLE_ADMIN}, so that
 * the {@code @Secured} controllers accept it and the access log records it exactly as the internal API key does.
 * Anything else - no key, a wrong key, or no key configured at all - is answered with a bare 404, indistinguishable
 * from an unknown path: the surface must not tell an unauthenticated caller that it exists. {@code sendError} is
 * deliberately not used because it would render the HTML error page.
 *
 * <p>The offered key is never logged, at any level.
 */
@Component
public class ExternalApiKeyFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ExternalApiKeyFilter.class);

    public static final String PATH_PREFIX = "/externalapi";
    public static final String PATH_PATTERN = PATH_PREFIX + "/**";
    public static final String API_KEY_HEADER = "X-Api-Key";
    public static final String API_KEY_PARAMETER = "apikey";
    public static final String PRINCIPAL = "externalApi";

    /**
     * The same matcher {@link org.nzbhydra.auth.SecurityConfig} builds its rules with, rather than a comparison on
     * {@code getRequestURI()}: it matches on the parsed and decoded path, so {@code /%65xternalapi/v1/ping} is
     * recognised as the external API and gets the same bodyless 404 as everything else. A raw prefix comparison would
     * have let it through to a handler mapping that decodes the path itself.
     */
    private static final RequestMatcher PATH_MATCHER = PathPatternRequestMatcher.withDefaults().matcher(PATH_PATTERN);

    private final ConfigProvider configProvider;
    private final boolean noApiKeyNeeded;

    public ExternalApiKeyFilter(ConfigProvider configProvider,
                               @Value("${nzbhydra.dev.noApiKey:false}") boolean noApiKeyNeeded) {
        this.configProvider = configProvider;
        this.noApiKeyNeeded = noApiKeyNeeded;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !isExternalApiRequest(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (!isKeyValid(request)) {
            logger.debug("Rejecting request to {} because no valid API key was provided", request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        UsernamePasswordAuthenticationToken token = UsernamePasswordAuthenticationToken.authenticated(
                PRINCIPAL, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN"));
        token.setDetails(new HydraWebAuthenticationDetails(request));
        //A fresh context rather than setting the authentication on the current one: a request that carries a session
        //cookie shares that session's SecurityContext instance, and mutating it would replace whoever is logged in
        //there with externalApi/ROLE_ADMIN for the rest of the session. This authentication lives for one request.
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(token);
        SecurityContextHolder.setContext(context);
        logger.debug("Authorized access to {} via the external API key", request.getRequestURI());
        chain.doFilter(request, response);
    }

    private boolean isKeyValid(HttpServletRequest request) {
        if (noApiKeyNeeded) {
            return true;
        }
        String configuredKey = configProvider.getBaseConfig().getMain().getApiKey();
        if (!StringUtils.hasText(configuredKey)) {
            //Without a configured key the whole surface stays unreachable instead of being open to everybody
            return false;
        }
        String offeredKey = request.getHeader(API_KEY_HEADER);
        if (offeredKey == null) {
            offeredKey = request.getParameter(API_KEY_PARAMETER);
        }
        return offeredKey != null && MessageDigest.isEqual(
                offeredKey.getBytes(StandardCharsets.UTF_8), configuredKey.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Matches {@code /externalapi} and everything below it, unknown sub-paths included, so that an unauthenticated
     * caller cannot map the surface by comparing status codes.
     */
    public static boolean isExternalApiRequest(HttpServletRequest request) {
        return PATH_MATCHER.matches(request);
    }
}
