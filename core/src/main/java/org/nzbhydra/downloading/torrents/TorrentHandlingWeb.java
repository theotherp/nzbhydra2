/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.torrents;

import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.downloading.DownloadResult;
import org.nzbhydra.downloading.InvalidSearchResultIdException;
import org.nzbhydra.downloading.SaveOrSendResultsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
public class TorrentHandlingWeb {

    private static final Logger logger = LoggerFactory.getLogger(TorrentHandlingWeb.class);

    @Autowired
    private TorrentFileHandler torrentHandler;
    @Autowired
    private ConfigProvider configProvider;

    /**
     * Provides an internal access to torrents via GUID
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/torrent/{guid}", produces = "application/x-bittorrent")
    @Secured({"ROLE_USER"})
    public ResponseEntity<Object> downloadTorrentInternal(@PathVariable("guid") long guid) throws InvalidSearchResultIdException {
        return torrentHandler.getTorrentByGuid(guid, configProvider.getBaseConfig().getDownloading().getNzbAccessType(), SearchSource.INTERNAL).getAsResponseEntity();
    }


    /**
     * Provides an external access to torrent via GUID for users.
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/gettorrent/user/{guid}", produces = "application/x-bittorrent")
    @Secured({"ROLE_USER"})
    public ResponseEntity<Object> downloadTorrentForUsers(@PathVariable("guid") long guid) throws InvalidSearchResultIdException {
        DownloadResult downloadResult = torrentHandler.getTorrentByGuid(guid, configProvider.getBaseConfig().getDownloading().getNzbAccessType(), SearchSource.INTERNAL);
        return downloadResult.getAsResponseEntity();
    }


    /**
     * Provides an external access to torrent via GUID for users.
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/saveOrSendTorrents", method = RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    @Secured({"ROLE_USER"})
    public SaveOrSendResultsResponse saveOrSendTorrents(@RequestBody Set<Long> searchResultIds) {
        return torrentHandler.saveOrSendTorrents(searchResultIds);
    }


    /**
     * Provides an external access to torrents via GUID
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/gettorrent/api/{guid}", produces = "application/x-bittorrent")
    public ResponseEntity<Object> downloadTorrentWithApikey(@PathVariable("guid") long guid, @RequestParam(required = false) String apikey) throws WrongApiKeyException, InvalidSearchResultIdException {
        BaseConfig baseConfig = configProvider.getBaseConfig();
        if (apikey == null || !apikey.equals(baseConfig.getMain().getApiKey())) {
            logger.error("Received torrent API download call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }

        return torrentHandler.getTorrentByGuid(guid, baseConfig.getDownloading().getNzbAccessType(), SearchSource.API).getAsResponseEntity();
    }

}
