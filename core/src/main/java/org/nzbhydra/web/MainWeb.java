package org.nzbhydra.web;

import org.nzbhydra.auth.UserInfosProvider;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.safeconfig.SafeConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.servlet.http.HttpSession;
import java.security.Principal;

@Controller
public class MainWeb {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private UserInfosProvider userInfos;
    private SafeConfig safeConfig = null;

    private SafeConfig getSafeConfig() {
        if (safeConfig == null) {
            safeConfig = new SafeConfig(configProvider.getBaseConfig());
        }
        return safeConfig;
    }


    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        safeConfig = new SafeConfig(configChangedEvent.getNewConfig());
    }

    @RequestMapping(value = "/**", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public String index(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    //Must exist and not be protected so that redirects to "/login" have a target
    @RequestMapping(value = "/login", method = RequestMethod.GET)
    public String index2(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "login";
    }

    @RequestMapping(value = "/config", method = RequestMethod.GET)
    @Secured({"ROLE_ADMIN"})
    public String config(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/system", method = RequestMethod.GET)
    @Secured({"ROLE_ADMIN"})
    public String system(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/stats", method = RequestMethod.GET)
    @Secured({"ROLE_STATS"})
    public String stats(HttpSession session, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }


    private void setSessionAttributes(HttpSession session, Principal principal) {
        BootstrappedDataTO bootstrappedData = userInfos.getUserInfos(principal);
        bootstrappedData.setSafeConfig(getSafeConfig());

        String urlBase = environment.getProperty("server.contextPath");
        if (urlBase == null) {
            urlBase = "";
        }
        session.setAttribute("baseUrl", (urlBase + "/").replace("//", "/"));
        session.setAttribute("bootstrap", bootstrappedData);
        String theme = configProvider.getBaseConfig().getMain().getTheme();
        session.setAttribute("cssUrl", "static/css/" + theme + ".css");
        session.setAttribute("disableBlockUi", System.getProperty("disableBlockUi", null) != null); //BlockUI overlays stuff and selenium thinks it's visible when it's not
    }


}
