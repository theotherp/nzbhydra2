package org.nzbhydra.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.nzbhydra.auth.UserInfosProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.security.Principal;
import java.util.Arrays;

/**
 * Serves the single application shell. ADR-0001's removal stages are complete (ADR-0023 accepted the
 * migration): there is no second shell to select any more, so every mapping renders {@code react.html}
 * unconditionally and a leftover {@code nzbhydra-ui} cookie in a returning browser is simply never read.
 */
@Controller
public class MainWeb {

    private static final String REACT_UI = "react";

    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private UserInfosProvider userInfos;

    @GetMapping("/")
    @Secured({"ROLE_USER"})
    public String index(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);

        return REACT_UI;
    }

    //Must exist and not be protected so that redirects to "/login" have a target
    @RequestMapping(value = "/login", method = {RequestMethod.GET, RequestMethod.PUT})
    public String index2(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return REACT_UI;
    }

    @GetMapping("/config/**")
    @Secured({"ROLE_ADMIN"})
    public String config(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return REACT_UI;
    }

    @GetMapping("/system/**")
    @Secured({"ROLE_ADMIN"})
    public String system(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return REACT_UI;
    }

    @GetMapping("/stats/**")
    @Secured({"ROLE_STATS"})
    public String stats(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return REACT_UI;
    }

    /**
     * Only reached when no authentication is configured -- otherwise Spring Security's own logout filter
     * handles {@code POST /logout} first (see {@code SecurityConfig}'s {@code logoutSuccessUrl}). The view
     * it renders used to be legacy's {@code index}; with that template gone it must be the React shell, or
     * logging out would resolve a template that no longer exists.
     */
    @PostMapping("/logout")
    public String logout(HttpSession session, Principal principal, HttpServletResponse response) {
        session.setAttribute("LOGGEDOUT", true);

        return REACT_UI;
    }

    @PostMapping("/loggedout")
    public String loggedOut(HttpSession session, Principal principal, HttpServletResponse response) {
        if (Boolean.TRUE.equals(session.getAttribute("LOGGEDOUT"))) {
            session.invalidate();
        }
        response.addHeader("WWW-Authenticate", "Basic realm=\"NZBHydra\"");
        response.setStatus(401);
        for (String cookieName : Arrays.asList("remember-me", "JSESSIONID")) {
            Cookie cookie = new Cookie(cookieName, null);

            cookie.setPath("/");
            cookie.setMaxAge(999999);
            cookie.setSecure(true);
            response.addCookie(cookie);

        }
        return REACT_UI;
    }


    private void setSessionAttributes(HttpSession session, Principal principal) {
        String urlBase = environment.getProperty("server.servlet.context-path");
        if (urlBase == null) {
            urlBase = "";
        }
        final String baseUrl = (urlBase + "/").replace("//", "/");
        BootstrappedDataTO bootstrappedData = userInfos.getBootstrapData(principal, baseUrl);
        session.setAttribute("baseUrl", baseUrl);
        session.setAttribute("bootstrap", bootstrappedData);
    }


}
