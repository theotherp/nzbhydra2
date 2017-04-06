package org.nzbhydra.api;

import org.nzbhydra.config.BaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationDetailsSource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.GenericFilterBean;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;

/**
 * Allows Spring Security based authentication with API keys. Currently not in use because just checking for the correct API key is simpler and more flexible with less code
 */
@Component
public class ApikeyAuthenticationFilter extends GenericFilterBean {

    private static final Logger logger = LoggerFactory.getLogger(ApikeyAuthenticationFilter.class);

    private AuthenticationDetailsSource<HttpServletRequest, ?> authenticationDetailsSource = new WebAuthenticationDetailsSource();

    @Autowired
    private BaseConfig baseConfig;

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String apikeyValue = req.getParameter("apikey");
            if (apikeyValue != null) {
                if (!apikeyValue.equals(baseConfig.getMain().getApiKey().get())) {
                    logger.warn("Request with invalid API key");
                } else {
                    logger.debug("Authorized request with API key");
                    SecurityContextHolder.getContext().setAuthentication(
                            createAuthentication((HttpServletRequest) req));
                }
            }
        }
        chain.doFilter(req, res);
    }

    protected Authentication createAuthentication(HttpServletRequest request) {
        PreAuthenticatedAuthenticationToken auth = new PreAuthenticatedAuthenticationToken("API", "API", AuthorityUtils.createAuthorityList("ROLE_API"));
        auth.setDetails(authenticationDetailsSource.buildDetails(request));
        return auth;
    }
}
