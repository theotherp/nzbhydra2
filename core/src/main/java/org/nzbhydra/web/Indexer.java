package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.CheckCapsRespone;
import org.nzbhydra.indexers.NewznabChecker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Indexer {

    @Autowired
    private NewznabChecker newznabChecker;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCaps", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CheckCapsRespone checkCaps(@RequestBody IndexerConfig indexerConfig) {
        return newznabChecker.checkCaps(indexerConfig);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse testConnection(@RequestBody IndexerConfig indexerConfig) {
        return newznabChecker.checkConnection(indexerConfig);
    }

}
