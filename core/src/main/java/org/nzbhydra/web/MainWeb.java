package org.nzbhydra.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import java.security.Principal;
import java.util.Arrays;

@Controller
public class MainWeb {

    static final String UI_SELECTOR_COOKIE = "nzbhydra-ui";
    private static final String REACT_UI = "react";
    private static final String LEGACY_UI = "legacy";
    private static final int UI_SELECTOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private UserInfosProvider userInfos;

    @GetMapping("/")
    @Secured({"ROLE_USER"})
    public String index(HttpSession session, Principal principal, HttpServletRequest request) {
        setSessionAttributes(session, principal);

        return shell(request);
    }

    //Must exist and not be protected so that redirects to "/login" have a target
    @RequestMapping(value = "/login", method = {RequestMethod.GET, RequestMethod.PUT})
    public String index2(HttpSession session, Principal principal, HttpServletRequest request) {
        setSessionAttributes(session, principal);
        return isReactSelected(request) ? "react" : "login";
    }

    @GetMapping("/config/**")
    @Secured({"ROLE_ADMIN"})
    public String config(HttpSession session, Principal principal, HttpServletRequest request) {
        setSessionAttributes(session, principal);
        return shell(request);
    }

    @GetMapping("/system/**")
    @Secured({"ROLE_ADMIN"})
    public String system(HttpSession session, Principal principal, HttpServletRequest request) {
        setSessionAttributes(session, principal);
        return shell(request);
    }

    @GetMapping("/stats/**")
    @Secured({"ROLE_STATS"})
    public String stats(HttpSession session, Principal principal, HttpServletRequest request) {
        setSessionAttributes(session, principal);
        return shell(request);
    }

    @GetMapping("/ui/react")
    public String selectReact(HttpServletRequest request, HttpServletResponse response,
                              @RequestParam(defaultValue = "/") String redirect) {
        return selectUi(REACT_UI, request, response, redirect);
    }

    @GetMapping("/ui/legacy")
    public String selectLegacy(HttpServletRequest request, HttpServletResponse response,
                               @RequestParam(defaultValue = "/") String redirect) {
        return selectUi(LEGACY_UI, request, response, redirect);
    }

    @PostMapping("/logout")
    public String logout(HttpSession session, Principal principal, HttpServletResponse response) {
        session.setAttribute("LOGGEDOUT", true);

        return "index";
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
        return "index";
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
        String theme = configProvider.getBaseConfig().getMain().getTheme();
        session.setAttribute("cssUrl", "static/css/" + theme + ".css");
        session.setAttribute("disableBlockUi", System.getProperty("disableBlockUi", null) != null); //BlockUI overlays stuff and selenium thinks it's visible when it's not
    }

    private String selectUi(String selectedUi, HttpServletRequest request, HttpServletResponse response, String redirect) {
        Cookie cookie = new Cookie(UI_SELECTOR_COOKIE, selectedUi);
        cookie.setPath(request.getContextPath().isEmpty() ? "/" : request.getContextPath());
        cookie.setHttpOnly(true);
        cookie.setSecure(request.isSecure());
        cookie.setMaxAge(UI_SELECTOR_MAX_AGE_SECONDS);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);

        return "redirect:" + safeRedirectPath(redirect);
    }

    private String shell(HttpServletRequest request) {
        return isReactSelected(request) ? "react" : "index";
    }

    private boolean isReactSelected(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return false;
        }
        for (Cookie cookie : cookies) {
            if (UI_SELECTOR_COOKIE.equals(cookie.getName())) {
                return REACT_UI.equals(cookie.getValue());
            }
        }
        return false;
    }

    private String safeRedirectPath(String redirect) {
        if (redirect == null || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.contains("\\") || redirect.contains("\r") || redirect.contains("\n")) {
            return "/";
        }
        return redirect;
    }


}
