package org.nzbhydra.auth;

import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

import java.util.List;

public class HydraAnonymousAuthenticationFilter extends AnonymousAuthenticationFilter {


    public HydraAnonymousAuthenticationFilter(List<String> anonymousUserRoles) {
        super("anonymous", "anonymousUser", AuthorityUtils.createAuthorityList(anonymousUserRoles.toArray(new String[anonymousUserRoles.size()])));
    }

}
