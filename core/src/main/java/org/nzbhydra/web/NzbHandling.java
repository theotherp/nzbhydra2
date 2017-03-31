package org.nzbhydra.web;

import org.nzbhydra.NzbDownloader;
import org.nzbhydra.config.BaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NzbHandling {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandling.class);

    @Autowired
    private NzbDownloader nzbDownloader;
    @Autowired
    private BaseConfig baseConfig;

    /**
     * Provides an internal access to NZBs via GUID
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/nzb/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<String> downloadNzbInternal(@PathVariable("guid") long guid) {
        return nzbDownloader.getNzbByGuid(guid, baseConfig.getSearching().getNzbAccessType()).getAsResponseEntity();
    }

    /**
     * Provides an external access to NZBs via GUID
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/getnzb/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<String> downloadNzb(@PathVariable("guid") long guid) {
        return nzbDownloader.getNzbByGuid(guid, baseConfig.getSearching().getNzbAccessType()).getAsResponseEntity();
    }

}
