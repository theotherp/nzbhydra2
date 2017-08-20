package org.nzbhydra.downloading;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.indexers.NfoResult;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.web.UsernameOrIpStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.util.List;

@RestController
public class NzbHandlingWeb {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandlingWeb.class);

    @Autowired
    private NzbHandler nzbHandler;
    @Autowired
    private ConfigProvider configProvider;

    /**
     * Provides an internal access to NZBs via GUID
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/nzb/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<String> downloadNzbInternal(@PathVariable("guid") long guid, HttpServletRequest request) {
        return nzbHandler.getNzbByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.INTERNAL, UsernameOrIpStorage.usernameOrIp.get()).getAsResponseEntity();
    }

    /**
     * Provides an internal access to a ZIP file with NZBs via GUID
     *
     * @return The ZIP content or a generic response with an error
     */
    @RequestMapping(value = "/internalapi/nzbzip", produces = "application/x-nzb", method = RequestMethod.POST)
    @Secured({"ROLE_USER"})
    public Object downloadNzbZip(@RequestBody List<Long> guids, HttpServletRequest request) {
        try {
            File zipFile = nzbHandler.getNzbsAsZip(guids, UsernameOrIpStorage.usernameOrIp.get());
            return ResponseEntity
                    .ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + zipFile.getName())
                    .contentLength(zipFile.length())
                    .body(new FileSystemResource(zipFile));
        } catch (Exception e) {
            logger.error("Error while creating ZIP with NZBs", e);
            return GenericResponse.notOk(e.getMessage());
        }
    }


    @RequestMapping(value = "/internalapi/nfo/{guid}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Secured({"ROLE_USER"})
    public NfoResult getNfo(@PathVariable("guid") long guid, HttpServletRequest request) throws IndexerAccessException {
        return nzbHandler.getNfo(guid);
    }

    @CrossOrigin
    @RequestMapping(value = "/externalapi/nzbstatus/id/{id}/{status}", method = RequestMethod.GET)
    public boolean updateNzbDownloadStatusByExternalId(@PathVariable("id") String externalId, @PathVariable("status") NzbDownloadStatus status, HttpServletRequest request) throws IndexerAccessException {
        logger.debug("Status update for download of NZB with GUID {} to status {}", externalId, status);
        return nzbHandler.updateStatusByExternalId(externalId, status);
    }

    @CrossOrigin
    @RequestMapping(value = "/externalapi/nzbstatus/title/{title}/{status}", method = RequestMethod.GET)
    public boolean updateNzbDownloadStatusByNzbName(@PathVariable("title") String title, @PathVariable("status") NzbDownloadStatus status, HttpServletRequest request) throws IndexerAccessException {
        logger.debug("Status update for download of NZB with title to status {}", title, status);
        return nzbHandler.updateStatusByNzbTitle(title, status);
    }

    @CrossOrigin
    @RequestMapping(value = "/externalapi/nzbstatus/id/{id}/title/{title}/{status}", method = RequestMethod.GET)
    public boolean updateNzbDownloadStatusByExternalIdOrNzbName(@PathVariable("id") String externalId, @PathVariable("title") String title, @PathVariable("status") NzbDownloadStatus status, HttpServletRequest request) throws IndexerAccessException {
        logger.debug("Status update for download of NZB with title to status {}", title, status);
        return nzbHandler.updateStatusByExternalIdOrTitle(externalId, title, status);
    }


    /**
     * Provides an external access to NZBs via GUID for users.
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/getnzb/user/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<String> downloadNzbForUsers(@PathVariable("guid") long guid, HttpServletRequest request) {
        return nzbHandler.getNzbByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.INTERNAL, UsernameOrIpStorage.usernameOrIp.get()).getAsResponseEntity();
    }

    /**
     * Provides an external access to NZBs via GUID and API key
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

        return nzbHandler.getNzbByGuid(guid, baseConfig.getSearching().getNzbAccessType(), SearchSource.INTERNAL, UsernameOrIpStorage.usernameOrIp.get()).getAsResponseEntity();
    }

}
