package org.nzbhydra.web;

import org.nzbhydra.NzbHandler;
import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
public class NzbHandling {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandling.class);

    @Autowired
    private NzbHandler nzbHandler;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UsernameOrIpProvider usernameOrIpProvider;

    /**
     * Provides an internal access to NZBs via GUID
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/nzb/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<String> downloadNzbInternal(@PathVariable("guid") long guid, HttpServletRequest request) {
        return nzbHandler.getNzbByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), usernameOrIpProvider.getUsernameOrIpInternal(request), SearchSource.INTERNAL).getAsResponseEntity();
    }


    /**
     * Provides an external access to NZBs via GUID for users.
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/getnzb/user/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<String> downloadNzbForUsers(@PathVariable("guid") long guid, HttpServletRequest request) {
        return nzbHandler.getNzbByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), usernameOrIpProvider.getUsernameOrIpInternal(request), SearchSource.INTERNAL).getAsResponseEntity();
    }

    /**
     * Provides an external access to NZBs via GUID
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/getnzb/api/{guid}", produces = "application/x-nzb")
    public ResponseEntity<String> downloadNzbWithApikey(@PathVariable("guid") long guid, @RequestParam(required = false) String apikey, HttpServletRequest request) throws WrongApiKeyException {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        if (baseConfig.getMain().getApiKey().isPresent() && !"".equals(baseConfig.getMain().getApiKey().get())) {
            if (apikey == null || !apikey.equals(baseConfig.getMain().getApiKey().get())) {
                logger.error("Received NZB API download call with wrong API key");
                throw new WrongApiKeyException("Wrong api key");
            }
        }

        return nzbHandler.getNzbByGuid(guid, baseConfig.getSearching().getNzbAccessType(), usernameOrIpProvider.getUsernameOrIpExternal(request), SearchSource.INTERNAL).getAsResponseEntity();
    }

}
