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

package org.nzbhydra.downloading.torrents;

import com.google.common.io.Files;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.downloading.DownloadResult;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.InvalidSearchResultIdException;
import org.nzbhydra.downloading.MagnetLinkRedirectException;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uriSchemeHandler.CouldNotOpenUriSchemeHandler;
import uriSchemeHandler.URISchemeHandler;

import java.io.File;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Component
public class TorrentFileHandler {

    private static final Logger logger = LoggerFactory.getLogger(TorrentFileHandler.class);

    @Autowired
    private FileHandler fileHandler;
    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    private SearchResultRepository searchResultRepository;

    @Transactional
    public DownloadResult getTorrentByGuid(long guid, FileDownloadAccessType accessType, SearchRequest.SearchSource accessSource) throws InvalidSearchResultIdException {
        //Get result. if link contains magnet: return redirect to magnet URI. otherwise return file
        Optional<SearchResultEntity> optionalResult = searchResultRepository.findById(guid);
        if (!optionalResult.isPresent()) {
            logger.error("Download request with invalid/outdated GUID {}", guid);
            throw new InvalidSearchResultIdException(guid, accessSource == SearchRequest.SearchSource.INTERNAL);
        }
        SearchResultEntity result = optionalResult.get();
        logger.info("Download request for \"{}\" from indexer {}", result.getTitle(), result.getIndexer().getName());
        if (result.getLink().contains("magnet:") || accessType == FileDownloadAccessType.REDIRECT) {
            return fileHandler.handleRedirect(accessSource, result);
        } else {
            try {
                return fileHandler.handleContentDownload(accessSource, result, "torrent");
            } catch (MagnetLinkRedirectException e) {
                return fileHandler.handleRedirect(accessSource, result);
            }
        }
    }

    public SaveOrSendTorrentsResponse saveOrSendTorrents(Set<Long> guids) {
        List<Long> successfulIds = new ArrayList<>();
        List<Long> failedIds = new ArrayList<>();
        for (Long guid : guids) {
            DownloadResult result;
            boolean successful = false;
            try {
                result = getTorrentByGuid(guid, FileDownloadAccessType.PROXY, SearchRequest.SearchSource.INTERNAL);
                if (result.isSuccessful()) {
                    if (result.getContent() != null) {
                        successful = saveToBlackHole(result, null);
                    } else {
                        successful = handleMagnetLink(result);
                    }
                }
            } catch (InvalidSearchResultIdException e) {
                logger.error("Unable to find result with ID {}", guid);
            }
            if (successful) {
                successfulIds.add(guid);
            } else {
                failedIds.add(guid);
            }
        }
        String message = failedIds.isEmpty() ? "All torrents successfully handled" : failedIds.size() + " torrents could not be handled";
        return new SaveOrSendTorrentsResponse(!successfulIds.isEmpty(), message, successfulIds, failedIds);
    }

    private boolean handleMagnetLink(DownloadResult result) {
        URI magnetLinkUri;
        try {
            magnetLinkUri = new URI(result.getCleanedUrl());
        } catch (URISyntaxException e) {
            logger.error("Unable to encode magnet URI {}", result.getUrl());
            return false;
        }
        if (configProvider.getBaseConfig().getDownloading().getSaveTorrentsTo().isPresent()) {
            return saveToBlackHole(result, magnetLinkUri);
        } else {
            logger.error("Torrent black hole folder not set");
            URISchemeHandler uriSchemeHandler = new URISchemeHandler();
            try {
                uriSchemeHandler.open(magnetLinkUri);
                return true;
            } catch (CouldNotOpenUriSchemeHandler e) {
                logger.error("Unable to add magnet link for {}: {}", result.getTitle(), e.getMessage());
                return false;
            } catch (RuntimeException e) {
                logger.error("No handler registered for magnet links. Unable to add link for {}", result.getTitle());
                return false;
            }
        }
    }

    private boolean saveToBlackHole(DownloadResult result, URI magnetLinkUri) {
        if (!configProvider.getBaseConfig().getDownloading().getSaveTorrentsTo().isPresent()) {
            logger.error("Torrent black hole folder not set");
            return false;
        }

        String sanitizedTitle = result.getTitle().replaceAll("[\\\\/:*?\"<>|]", "_");
        if (!Objects.equals(sanitizedTitle, result.getTitle())) {
            logger.info("Sanitized torrent title from '{}' to '{}'", result.getTitle(), sanitizedTitle);
        }
        byte[] content;
        File torrent;
        if(magnetLinkUri != null){
            torrent = new File(configProvider.getBaseConfig().getDownloading().getSaveTorrentsTo().get(), sanitizedTitle + ".magnet");
            String UriContent = magnetLinkUri.toString();
            content = UriContent.getBytes();
        }else{
            torrent = new File(configProvider.getBaseConfig().getDownloading().getSaveTorrentsTo().get(), sanitizedTitle + ".torrent");
            content = result.getContent();
        }
        if (torrent.exists()) {
            logger.info("File {} already exists and will be skipped", torrent.getAbsolutePath());
            return false;
        }
        try {
            Files.write(content, torrent);
            logger.info("Saved torrent file to {}", torrent.getAbsolutePath());
            return true;
        } catch (Exception e) {
            logger.error("Error saving torrent file", e);
            return false;
        }

    }

}
