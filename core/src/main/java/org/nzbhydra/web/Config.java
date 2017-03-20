package org.nzbhydra.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpSession;

@RestController
public class Config {
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET)
    public String getConfig(HttpSession session) {
        return "This should return the config";
    }

    @RequestMapping(value = "/internalapi/config", method = RequestMethod.PUT)
    public String setConfig(HttpSession session) {
        return "This should set the config";
    }
}
