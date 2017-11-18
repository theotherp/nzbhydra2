package org.nzbhydra.indexers;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.NewznabChecker.CheckerEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class IndexerWeb {

    @Autowired
    private NewznabChecker newznabChecker;

    //Probability of multiple threads calling this is minimal
    private List<String> checkerMessages = new ArrayList<>();

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCaps", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CheckCapsRespone checkCaps(@RequestBody IndexerConfig indexerConfig) {
        checkerMessages.clear();
        return newznabChecker.checkCaps(indexerConfig);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCapsMessages", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getCheckerMessages() {
        return checkerMessages;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse testConnection(@RequestBody IndexerConfig indexerConfig) {
        return newznabChecker.checkConnection(indexerConfig);
    }

    @EventListener
    public void handleCheckerEvent(CheckerEvent event) {
      checkerMessages.add(event.getMessage());
    }

}
