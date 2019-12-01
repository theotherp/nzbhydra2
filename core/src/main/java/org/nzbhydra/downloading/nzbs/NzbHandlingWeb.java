/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading.nzbs;

import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.FileZipResponse;
import org.nzbhydra.downloading.InvalidSearchResultIdException;
import org.nzbhydra.indexers.NfoResult;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
public class NzbHandlingWeb {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandlingWeb.class);

    @Value("${nzbhydra.dev.noApiKey:false}")
    private boolean noApiKeyNeeded = false;

    @Autowired
    private FileHandler fileHandler;
    @Autowired
    private ConfigProvider configProvider;


    /**
     * Provides an internal access to NZBs via GUID
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/nzb/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<Object> downloadNzbInternal(@PathVariable("guid") long guid) throws InvalidSearchResultIdException {
        return fileHandler.getFileByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.INTERNAL).getAsResponseEntity();
    }

    /**
     * Provides an internal access to a ZIP file with NZBs via GUID
     *
     * @return The ZIP content or a generic response with an error
     */
    @RequestMapping(value = "/internalapi/nzbzip", produces = MediaType.APPLICATION_JSON_VALUE, method = RequestMethod.POST)
    @Secured({"ROLE_USER"})
    public FileZipResponse getNzbZipData(@RequestBody List<Long> guids) {
        try {
            return fileHandler.getFilesAsZip(guids);
        } catch (Exception e) {
            logger.error("Error while creating ZIP with NZBs", e);
            return new FileZipResponse(false, null, "Error while creating ZIP with NZBs: " + e.getMessage(), Collections.emptyList(), guids);
        }
    }

    @RequestMapping(value = "/internalapi/nzbzipDownload", produces = MediaType.APPLICATION_JSON_VALUE, method = RequestMethod.POST)
    @Secured({"ROLE_USER"})
    public FileSystemResource downloadNzbZip(@RequestBody String zipFilepath) {
        return new FileSystemResource(zipFilepath);
    }


    @RequestMapping(value = "/internalapi/nfo/{guid}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Secured({"ROLE_USER"})
    public NfoResult getNfo(@PathVariable("guid") long guid) throws IndexerAccessException {
        return fileHandler.getNfo(guid);
    }

    /**
     * Provides an external access to NZBs via GUID for users.
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/getnzb/user/{guid}", produces = "application/x-nzb")
    @Secured({"ROLE_USER"})
    public ResponseEntity<Object> downloadNzbForUsers(@PathVariable("guid") long guid) throws InvalidSearchResultIdException {
        return fileHandler.getFileByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.INTERNAL).getAsResponseEntity();
    }

    /**
     * Provides an external access to NZBs via GUID and API key
     *
     * @return A {@link ResponseEntity} with the NZB content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/getnzb/api/{guid}", produces = "application/x-nzb")
    public ResponseEntity downloadNzbWithApikey(@PathVariable("guid") long guid, @RequestParam(required = false) String apikey) throws WrongApiKeyException {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        if ((apikey == null || !apikey.equals(baseConfig.getMain().getApiKey())) && !noApiKeyNeeded) {
            logger.error("Received NZB API download call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }

        try {
            return fileHandler.getFileByGuid(guid, baseConfig.getSearching().getNzbAccessType(), SearchSource.API).getAsResponseEntity();
        } catch (InvalidSearchResultIdException e) {
            //Should be RssError but causes an exception in ServletInvocableHandlerMethod.invokeAndHandle()
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_XML).body("<error code=\"300\" description=\"Invalid or outdated search result ID\"/>");
        }
    }



}
