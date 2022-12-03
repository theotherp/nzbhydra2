package org.nzbhydra.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.safeconfig.SafeConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.security.Principal;
import java.util.Arrays;

@Controller
public class MainWeb {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private UserInfosProvider userInfos;

    private SafeConfig getSafeConfig() {
        return new SafeConfig(configProvider.getBaseConfig());
    }


//    @RequestMapping(value = "/{{ match.model.posterUrl }}", method = RequestMethod.GET)
//    @Secured({"ROLE_USER"})
//    public String indexMatch(HttpSession session, Principal principal, HttpServletResponse response) {
//        //Super hacky. Autocomplete for some reason sometimes does not evaluate the expression and tries to use {{ match.model.posterUrl }} as a URL
//        setSessionAttributes(session, principal);
//
//        return "index";
//    }

    @RequestMapping(value = "/", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public String index(HttpSession session, Principal principal, HttpServletResponse response) {
        setSessionAttributes(session, principal);

        return "index";
    }

    //Must exist and not be protected so that redirects to "/login" have a target
    @RequestMapping(value = "/login", method = {RequestMethod.GET, RequestMethod.PUT})
    public String index2(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "login";
    }

    @RequestMapping(value = "/config/**", method = RequestMethod.GET)
    @Secured({"ROLE_ADMIN"})
    public String config(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/system/**", method = RequestMethod.GET)
    @Secured({"ROLE_ADMIN"})
    public String system(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/stats/**", method = RequestMethod.GET)
    @Secured({"ROLE_STATS"})
    public String stats(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/logout", method = RequestMethod.POST)
    public String logout(HttpSession session, Principal principal, HttpServletResponse response) {
        session.setAttribute("LOGGEDOUT", true);

        return "index";
    }

    @RequestMapping(value = "/loggedout", method = RequestMethod.POST)
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
        BootstrappedDataTO bootstrappedData = userInfos.getUserInfos(principal);
        bootstrappedData.setSafeConfig(getSafeConfig());

        String urlBase = environment.getProperty("server.servlet.context-path");
        if (urlBase == null) {
            urlBase = "";
        }
        final String baseUrl = (urlBase + "/").replace("//", "/");
        session.setAttribute("baseUrl", baseUrl);
        bootstrappedData.setBaseUrl(baseUrl);
        session.setAttribute("bootstrap", bootstrappedData);
        String theme = configProvider.getBaseConfig().getMain().getTheme();
        session.setAttribute("cssUrl", "static/css/" + theme + ".css");
        session.setAttribute("disableBlockUi", System.getProperty("disableBlockUi", null) != null); //BlockUI overlays stuff and selenium thinks it's visible when it's not
    }


}
