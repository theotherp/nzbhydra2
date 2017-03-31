package org.nzbhydra.web;

import org.nzbhydra.searching.CategoryProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@Controller
public class Main {

    @Autowired
    private CategoryProvider categoryProvider;

    @RequestMapping(value = "/**", method = RequestMethod.GET)
    @Secured({"ROLE_USER"})
    public String index(HttpSession session, HttpServletRequest request) {
        //TODO improve bootstrapping / safe config handling, extract to own class, derive from base config and let spring do the REST (haha)
        session.setAttribute("baseUrl", "/");
        Map<String, Object> bootstrappedData = new HashMap<>();
        Map<String, Object> safeConfig = new HashMap<>();
        safeConfig.put("categories", categoryProvider.getCategories());
        Map<String, Object> searchingConfig = new HashMap<>();
        searchingConfig.put("enableCategorySises", true);
        safeConfig.put("searching", searchingConfig);
        bootstrappedData.put("safeConfig", safeConfig);
        session.setAttribute("bootstrap", bootstrappedData);
        return "index";
    }


}
