package org.nzbhydra.tour;

import org.nzbhydra.GenericResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
public class GuidedTourWeb {

    @Autowired
    private GuidedTourProvider guidedTourProvider;

    @GetMapping("/internalapi/guidedtour/hidden")
    @Secured({"ROLE_USER"})
    public boolean isTourHidden(Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        return guidedTourProvider.isTourHiddenForUser(username);
    }

    @PutMapping("/internalapi/guidedtour/hidden")
    @Secured({"ROLE_USER"})
    public GenericResponse setTourHidden(@RequestBody boolean hidden, Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        guidedTourProvider.setTourHiddenForUser(username, hidden);
        return GenericResponse.ok();
    }

    @PutMapping("/internalapi/guidedtour/hide")
    @Secured({"ROLE_USER"})
    public GenericResponse hideTour(Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        guidedTourProvider.setTourHiddenForUser(username, true);
        return GenericResponse.ok();
    }
}
