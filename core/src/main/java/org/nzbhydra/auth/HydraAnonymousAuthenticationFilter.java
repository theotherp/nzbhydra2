package org.nzbhydra.auth;

import org.nzbhydra.config.AuthConfig;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationDetailsSource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;


/**
 * Extension of {@link AnonymousAuthenticationFilter} that allows updating the anoymous user's role at runtime
 */
@Component
public class HydraAnonymousAuthenticationFilter extends AnonymousAuthenticationFilter {

    private AuthenticationDetailsSource<HttpServletRequest, ?> authenticationDetailsSource = new WebAuthenticationDetailsSource();
    private String key = "anonymous";
    private Object principal = "anonymousUser";
    private List<GrantedAuthority> authorities;

    public HydraAnonymousAuthenticationFilter(@Autowired BaseConfig baseConfig) {
        super("anonymous", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));
        updateAuthorities(baseConfig.getAuth());
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        updateAuthorities(event.getNewConfig().getAuth());
    }

    private void updateAuthorities(AuthConfig authConfig) {
        List<String> anonymousUserRoles = new ArrayList<>();
        if (!authConfig.isRestrictSearch()) {
            anonymousUserRoles.add("ROLE_USER");
            logger.info("Granting basic user rights to anonymous users");
        }
        if (!authConfig.isRestrictStats()) {
            anonymousUserRoles.add("ROLE_STATS");
            logger.info("Granting stats rights to anonymous users");
        }
        if (!authConfig.isRestrictAdmin()) {
            anonymousUserRoles.add("ROLE_ADMIN");
            logger.info("Granting admin rights to anonymous users");
        }
        if (!anonymousUserRoles.isEmpty()) {
            anonymousUserRoles.add("ROLE_ANONYMOUS");
        }
        authorities = AuthorityUtils.createAuthorityList(anonymousUserRoles.toArray(new String[anonymousUserRoles.size()]));
    }


    //Everything from here on is taken from the base class

    @Override
    public void afterPropertiesSet() {
        Assert.hasLength(key, "key must have length");
        Assert.notNull(principal, "Anonymous authentication principal must be set");
        Assert.notNull(authorities, "Anonymous authorities must be set");
    }

    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            SecurityContextHolder.getContext().setAuthentication(
                    createAuthentication((HttpServletRequest) req));

            if (logger.isDebugEnabled()) {
                logger.debug("Populated SecurityContextHolder with anonymous token: '"
                        + SecurityContextHolder.getContext().getAuthentication() + "'");
            }
        } else {
            if (logger.isDebugEnabled()) {
                logger.debug("SecurityContextHolder not populated with anonymous token, as it already contained: '"
                        + SecurityContextHolder.getContext().getAuthentication() + "'");
            }
        }

        chain.doFilter(req, res);
    }

    protected Authentication createAuthentication(HttpServletRequest request) {
        AnonymousAuthenticationToken auth = new AnonymousAuthenticationToken(key,
                principal, authorities);
        auth.setDetails(authenticationDetailsSource.buildDetails(request));

        return auth;
    }

    public void setAuthenticationDetailsSource(
            AuthenticationDetailsSource<HttpServletRequest, ?> authenticationDetailsSource) {
        Assert.notNull(authenticationDetailsSource,
                "AuthenticationDetailsSource required");
        this.authenticationDetailsSource = authenticationDetailsSource;
    }

    public Object getPrincipal() {
        return principal;
    }

    public List<GrantedAuthority> getAuthorities() {
        return authorities;
    }

}
