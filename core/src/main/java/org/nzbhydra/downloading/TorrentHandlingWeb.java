package org.nzbhydra.downloading;

import com.google.common.io.Files;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
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

import java.io.File;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@RestController
public class TorrentHandlingWeb {

    private static final Logger logger = LoggerFactory.getLogger(TorrentHandlingWeb.class);

    @Autowired
    private NzbHandler nzbHandler;
    @Autowired
    private ConfigProvider configProvider;

    /**
     * Provides an internal access to torrents via GUID
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/torrent/{guid}", produces = "application/x-bittorrent")
    @Secured({"ROLE_USER"})
    public ResponseEntity<Object> downloadTorrentInternal(@PathVariable("guid") long guid) throws InvalidSearchResultIdException{
        return nzbHandler.getNzbByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.INTERNAL).getAsResponseEntity();
    }


    /**
     * Provides an external access to torrent via GUID for users.
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/gettorrent/user/{guid}", produces = "application/x-bittorrent")
    @Secured({"ROLE_USER"})
    public ResponseEntity<Object> downloadTorrentForUsers(@PathVariable("guid") long guid) throws InvalidSearchResultIdException{
        NzbDownloadResult downloadResult = nzbHandler.getNzbByGuid(guid, configProvider.getBaseConfig().getSearching().getNzbAccessType(), SearchSource.INTERNAL);
        return downloadResult.getAsResponseEntity();
    }

    /**
     * Provides an external access to torrent via GUID for users.
     *
     * @return A {@link ResponseEntity} with the torrent content, a redirect to the actual indexer link or an error
     */
    @RequestMapping(value = "/internalapi/saveTorrent", method= RequestMethod.PUT, produces = MediaType.APPLICATION_JSON_VALUE)
    @Secured({"ROLE_USER"})
    public AddTorrentsResponse sentTorrentToBlackhole(@RequestBody Set<Long> searchResultIds) throws InvalidSearchResultIdException{
        if (!configProvider.getBaseConfig().getDownloading().getSaveTorrentsTo().isPresent()) {
            logger.error("Torrent black hole folder not set");
            return new AddTorrentsResponse(false, "Torrent black hole folder not set", Collections.emptyList(), searchResultIds);
        }
        Set<Long> addedIds = new HashSet<>();
        for (Long guid : searchResultIds) {
            NzbDownloadResult downloadResult = nzbHandler.getNzbByGuid(guid, NzbAccessType.PROXY, SearchSource.INTERNAL);
            if (!downloadResult.isSuccessful()) {
                return handleError("An error occurred while downloading torrent: " + downloadResult.getError(), searchResultIds, addedIds);
            }
            String sanitizedTitle = downloadResult.getTitle().replaceAll("[\\\\/:*?\"<>|]", "_");
            if(!Objects.equals(sanitizedTitle, downloadResult.getTitle())) {
                logger.info("Sanitized torrent title from '{}' to '{}'", downloadResult.getTitle(), sanitizedTitle);
            }
            File torrent = new File(configProvider.getBaseConfig().getDownloading().getSaveTorrentsTo().get(), sanitizedTitle + ".torrent");
            if (torrent.exists()) {
                logger.info("File {} already exists and will be skipped", torrent.getAbsolutePath());
                continue;
            }
            try {
                Files.write(downloadResult.getNzbContent().getBytes(), torrent);
                logger.info("Saved torrent file to {}", torrent.getAbsolutePath());
                addedIds.add(guid);
            } catch (Exception e) {
                logger.error("Error saving torrent file", e);
                return handleError("Error saving torrent file: " + e.getMessage(), searchResultIds, addedIds);
            }
        }

        return new AddTorrentsResponse(true, null, addedIds, Collections.emptySet());
    }

    protected AddTorrentsResponse handleError(String message, Set<Long> searchResultIds, Set<Long> addedIds) {
        searchResultIds.removeAll(addedIds);
        return new AddTorrentsResponse(false, message, addedIds, searchResultIds);
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

        return nzbHandler.getNzbByGuid(guid, baseConfig.getSearching().getNzbAccessType(), SearchSource.API).getAsResponseEntity();
    }

    @Data
    @AllArgsConstructor
    public class AddTorrentsResponse {
        private boolean successful;
        private String message;
        private Collection<Long> addedIds;
        private Collection<Long> missedIds;
    }

}
