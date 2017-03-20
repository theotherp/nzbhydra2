package org.nzbhydra.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import javax.servlet.http.HttpSession;

@Controller
public class Search {
    @RequestMapping("/search/**")
    public String search(HttpSession session) {
        return "This is the search";
    }
}
