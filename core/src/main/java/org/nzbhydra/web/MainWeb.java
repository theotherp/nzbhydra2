package org.nzbhydra.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@Controller
public class MainWeb {

    @RequestMapping("/")
    public String index(HttpSession session) {
        session.setAttribute("baseUrl", "/");
        Map<String, String> map = new HashMap<>();
        map.put("key", "value");
        session.setAttribute("bootstrap", map);
        return "index";
    }


}
