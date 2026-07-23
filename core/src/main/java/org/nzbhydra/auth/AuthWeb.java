package org.nzbhydra.auth;

import jakarta.servlet.http.HttpSession;
import org.nzbhydra.web.BootstrappedDataTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
public class AuthWeb {

    @Autowired
    private UserInfosProvider userInfos;

    @GetMapping("/internalapi/askadmin")
    @Secured({"ROLE_ADMIN"})
    public String askForAdmin(HttpSession session, Principal principal) {
        return "index";
    }

    @GetMapping("/internalapi/askpassword")
    public ResponseEntity<BootstrappedDataTO> askForPassword(HttpSession session, Principal principal) {
        if (SecurityContextHolder.getContext().getAuthentication() != null && !"AnonymousUser".equals(SecurityContextHolder.getContext().getAuthentication().getPrincipal())) {
            return ResponseEntity.ok(userInfos.getUserInfos(principal));
        }
        return ResponseEntity.status(401).header("WWW-Authenticate", "Basic realm=\"Ask for password\"").body(null);
    }

    @GetMapping(value = "/internalapi/userinfos", produces = MediaType.APPLICATION_JSON_VALUE)
    public BootstrappedDataTO userinfos(HttpSession session, Principal principal) {
        return userInfos.getUserInfos(principal);
    }

}
