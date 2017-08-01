package org.nzbhydra.auth;

import org.nzbhydra.web.BootstrappedDataTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.security.Principal;

@RestController
public class AuthWeb {

    @Autowired
    private UserInfosProvider userInfos;

    @RequestMapping(value = "/internalapi/askadmin", method = RequestMethod.GET)
    @Secured({"ROLE_ADMIN"})
    public String askForAdmin(HttpSession session, HttpServletRequest request, Principal principal) {
        return "index";
    }

    @RequestMapping(value = "/internalapi/askpassword", method = RequestMethod.GET)
    public ResponseEntity<BootstrappedDataTO> askForPassword(HttpSession session, HttpServletRequest request, Principal principal) {
        if (SecurityContextHolder.getContext().getAuthentication() != null && !"AnonymousUser".equals(SecurityContextHolder.getContext().getAuthentication().getPrincipal())) {
            return ResponseEntity.ok(userInfos.getUserInfos(principal));
        }
        return ResponseEntity.status(401).header("WWW-Authenticate", "Basic realm=\"Ask for password\"").body(null);
    }

    @RequestMapping(value = "/internalapi/userinfos", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BootstrappedDataTO userinfos(HttpSession session, HttpServletRequest request, Principal principal) {
        return userInfos.getUserInfos(principal);
    }

}
