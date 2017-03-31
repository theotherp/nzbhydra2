package org.nzbhydra.web;

import org.nzbhydra.config.AuthConfig;
import org.nzbhydra.config.AuthType;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.UserAuthConfig;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.web.mapping.BootstrappedData;
import org.nzbhydra.web.mapping.SafeConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.security.Principal;
import java.util.Optional;

@Controller
public class Main {

    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    @Autowired
    private CategoryProvider categoryProvider;
    @Autowired
    private BaseConfig baseConfig;

    @RequestMapping(value = "/login", method = RequestMethod.GET)
    public String login(HttpSession session, HttpServletRequest request, Principal principal) {
        return "login";
    }


    @RequestMapping(value = "/**", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public String index(HttpSession session, HttpServletRequest request, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/config", method = RequestMethod.GET)
    @Secured({"ADMIN"})
    public String config(HttpSession session, HttpServletRequest request, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/system", method = RequestMethod.GET)
    @Secured({"ADMIN"})
    public String system(HttpSession session, HttpServletRequest request, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "/stats", method = RequestMethod.GET)
    @Secured({"STATS"})
    public String stats(HttpSession session, HttpServletRequest request, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    @RequestMapping(value = "internalapi/askadmin", method = RequestMethod.GET)
    @Secured({"ADMIN"})
    public String askForAdmin(HttpSession session, HttpServletRequest request, Principal principal) {
        setSessionAttributes(session, principal);
        return "index";
    }

    private void setSessionAttributes(HttpSession session, Principal principal) {
        BootstrappedData bootstrappedData = new BootstrappedData();
        bootstrappedData = setUserInfos(bootstrappedData, principal);
        bootstrappedData.setBaseUrl("/"); //TODO

        SafeConfig safeConfig = new SafeConfig();
        safeConfig.setCategories(categoryProvider.getCategories());
        safeConfig.setSearching(baseConfig.getSearching());
        bootstrappedData.setSafeConfig(safeConfig);

        session.setAttribute("baseUrl", "/");

        /*
        Map<String, Object> safeConfig = new HashMap<>();
        safeConfig.put("categories", categoryProvider.getCategories());
        Map<String, Object> searchingConfig = new HashMap<>();
        searchingConfig.put("enableCategorySizes", true);
        safeConfig.put("searching", searchingConfig);
        bootstrappedData.put("safeConfig", safeConfig);
        session.setAttribute("bootstrap", bootstrappedData);
        */

        session.setAttribute("bootstrap", bootstrappedData);
    }

    private BootstrappedData setUserInfos(BootstrappedData bootstrappedData, Principal principal) {
        AuthConfig auth = baseConfig.getAuth();

        boolean authConfigured = auth.getAuthType() != AuthType.NONE && !auth.getUsers().isEmpty();
        boolean adminRestricted = auth.isRestrictAdmin() && authConfigured;
        boolean statsRestricted = auth.isRestrictStats() && authConfigured;
        boolean searchRestricted = auth.isRestrictSearch() && authConfigured;
        boolean detailsDlRestricted = auth.isRestrictIndexerSelection() && authConfigured;
        boolean indexerSelectionRestricted = auth.isRestrictIndexerSelection() && authConfigured;
        boolean showIndexerSelection;
        String username;
        boolean maySeeAdmin;
        boolean maySeeStats;
        boolean maySeeDetailsDl;
        Optional<UserAuthConfig> user = auth.getUsers().stream().filter(x -> x.getUsername().equals(principal.getName())).findFirst();
        if (user.isPresent()) {
            maySeeAdmin = user.get().isMaySeeAdmin();
            maySeeStats = user.get().isMaySeeStats() || user.get().isMaySeeAdmin();
            maySeeDetailsDl = user.get().isMaySeeDetailsDl() || !detailsDlRestricted;
            showIndexerSelection = user.get().isShowIndexerSelection() || !indexerSelectionRestricted;
            username = user.get().getUsername();
        } else if (!authConfigured) {
            maySeeAdmin = true;
            maySeeStats = true;
            maySeeDetailsDl = true;
            showIndexerSelection = true;
            username = null;
        } else {
            maySeeAdmin = false;
            maySeeStats = false;
            maySeeDetailsDl = !detailsDlRestricted;
            showIndexerSelection = !indexerSelectionRestricted;
            username = null;
        }

        bootstrappedData.setAuthType(auth.getAuthType().name());
        bootstrappedData.setAuthConfigured(authConfigured);
        bootstrappedData.setAdminRestricted(adminRestricted);
        bootstrappedData.setSearchRestricted(searchRestricted);
        bootstrappedData.setStatsRestricted(statsRestricted);
        bootstrappedData.setShowIndexerSelection(showIndexerSelection);
        bootstrappedData.setMaySeeDetailsDl(maySeeDetailsDl);
        bootstrappedData.setMaySeeAdmin(maySeeAdmin);
        bootstrappedData.setMaySeeStats(maySeeStats);
        bootstrappedData.setMaySeeDetailsDl(maySeeDetailsDl);
        bootstrappedData.setMaySeeSearch(!auth.isRestrictSearch() || !authConfigured || user.isPresent());
        bootstrappedData.setUsername(username);

        return bootstrappedData;
    }


}
