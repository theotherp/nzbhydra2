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

package org.nzbhydra.downloading.downloaders;

import com.google.common.base.Joiner;
import com.google.common.base.Stopwatch;
import com.google.common.collect.Iterables;
import com.google.common.collect.Sets;
import jakarta.persistence.EntityNotFoundException;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.DownloadResult;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloadurls.DownloadLink;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.downloading.exceptions.DuplicateNzbException;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.notifications.DownloadCompletionNotificationEvent;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public abstract class Downloader {

    private static final Logger logger = LoggerFactory.getLogger(Downloader.class);

    protected final Map<Long, String> guidExternalIds = ExpiringMap.builder()
            .expirationPolicy(ExpirationPolicy.CREATED)
            .expiration(5, TimeUnit.MINUTES)
            .build();
    private final DownloadUrlBuilder downloadUrlBuilder;

    public enum StatusCheckType {
        QUEUE,
        HISTORY
    }


    protected FileHandler fileHandler;
    protected SearchResultRepository searchResultRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions;
    protected final ConfigProvider configProvider;

    protected DownloaderConfig downloaderConfig;
    protected List<Long> downloadRates = new ArrayList<>();

    public Downloader(FileHandler fileHandler, SearchResultRepository searchResultRepository, ApplicationEventPublisher applicationEventPublisher, IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions, ConfigProvider configProvider, DownloadUrlBuilder downloadUrlBuilder) {
        this.fileHandler = fileHandler;
        this.searchResultRepository = searchResultRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.indexerSpecificDownloadExceptions = indexerSpecificDownloadExceptions;
        this.configProvider = configProvider;
        this.downloadUrlBuilder = downloadUrlBuilder;
    }

    public void initialize(DownloaderConfig downloaderConfig) {
        this.downloaderConfig = downloaderConfig;
    }

    public boolean isEnabled() {
        return downloaderConfig != null && downloaderConfig.isEnabled();
    }

    public String getName() {
        return downloaderConfig.getName();
    }

    @Transactional
    public AddNzbsResponse addBySearchResultIds(List<AddFilesRequest.SearchResult> searchResults, String category) {

        Set<Long> addedNzbs = new HashSet<>();
        Set<SearchResultEntity> missedNzbs = new HashSet<>();
        Set<Long> failedSearchResultIds = new HashSet<>();

        for (AddFilesRequest.SearchResult entry : searchResults) {
            try {
                Long guid = Long.valueOf(entry.getSearchResultId());
                String categoryToSend;

                if ("Use original category".equals(category)) {
                    if ("N/A".equals(entry.getOriginalCategory())) {
                        logger.info("Using mapped category {} because the original category is N/A", entry.getMappedCategory());
                        categoryToSend = entry.getMappedCategory();
                    } else {
                        categoryToSend = entry.getOriginalCategory();
                    }
                } else if ("Use mapped category".equals(category)) {
                    categoryToSend = entry.getMappedCategory();
                } else if ("Use no category".equals(category)) {
                    categoryToSend = null;
                } else {
                    categoryToSend = category;
                }

                Optional<SearchResultEntity> optionalResult = searchResultRepository.findById(guid);
                if (optionalResult.isEmpty()) {
                    logger.error("Download request with invalid/outdated GUID {}", guid);
                    failedSearchResultIds.add(guid);
                    continue;
                }
                final SearchResultEntity searchResult = optionalResult.get();
                final String searchResultTitle = optionalResult.get().getTitle();
                final IndexerConfig indexerConfig = configProvider.getIndexerByName(optionalResult.get().getIndexer().getName());
                try {

                    NzbAddingType addingType = getNzbAddingType(searchResult.getDownloadType(), searchResult);
                    final FileDownloadAccessType accessTypeForIndexer = indexerSpecificDownloadExceptions.getAccessTypeForIndexer(indexerConfig, configProvider.getBaseConfig().getDownloading().getNzbAccessType(), searchResult);
                    if (addingType == NzbAddingType.UPLOAD && accessTypeForIndexer == FileDownloadAccessType.PROXY) {
                        logger.debug("Adding type UPLOAD and file download access type PROXY for downloader {} and indexer {}", getName(), indexerConfig.getName());
                        // As we need to get the NZB and send it to the downloader there's no difference between redirect or proxy
                        DownloadResult result = fileHandler.getFileByResult(FileDownloadAccessType.PROXY, SearchSource.INTERNAL, optionalResult.get()); //Uploading NZBs can only be done via proxying
                        if (result.isSuccessful()) {
                            String externalId = addContent(result.getContent(), result.getTitle(), searchResult.getDownloadType(), categoryToSend);
                            result.getDownloadEntity().setExternalId(externalId);
                            fileHandler.updateStatusByEntity(result.getDownloadEntity(), FileDownloadStatus.NZB_ADDED);
                            addedNzbs.add(guid);
                        } else {
                            missedNzbs.add(searchResult);
                        }
                    } else {
                        logger.debug("Adding type SEND_LINK for downloader {} and indexer {}", getName(), indexerConfig.getName());
                        //Adding type is SEND_LINK or indexer requires a redirect or even sending the direct link
                        //In any case we send a link, either to us or to the indexer
                        DownloadLink link = downloadUrlBuilder.getDownloadLinkForSendingToDownloader(searchResult, false);

                        String externalId = addLink(link.link(), searchResultTitle, searchResult.getDownloadType(), categoryToSend);
                        guidExternalIds.put(guid, externalId);
                        addedNzbs.add(guid);

                        //Ideally we would add the download and set it to failed after an exception but that is too much work
                        if (!link.isInternal()) {
                            logger.debug("Saving download for sending an external link to the downloader");
                            //We're sending an external link to the downloader and will never hear back about that so we need to store this as a download
                            fileHandler.handleRedirect(SearchSource.INTERNAL, searchResult, link.link());
                        }
                    }
                } catch (DuplicateNzbException e) {
                    if (searchResult != null) {
                        missedNzbs.add(searchResult);
                    }
                }
            } catch (EntityNotFoundException e) {
                logger.error("Unable to find the search result in the database for ID: {}", entry.getSearchResultId());
                failedSearchResultIds.add(Long.valueOf(entry.getSearchResultId()));
            } catch (DownloaderException e) {
                // DownloaderException indicates a downloader-wide issue, so we stop processing
                logger.error("Downloader error: {}", e.getMessage());
                String message = e.getMessage();
                if (!addedNzbs.isEmpty()) {
                    message += ".\n" + addedNzbs.size() + " were added successfully before the error";
                }
                // Add remaining unprocessed search results to failed list
                for (AddFilesRequest.SearchResult remainingEntry : searchResults) {
                    Long remainingGuid = Long.valueOf(remainingEntry.getSearchResultId());
                    if (!addedNzbs.contains(remainingGuid) && !failedSearchResultIds.contains(remainingGuid)) {
                        failedSearchResultIds.add(remainingGuid);
                    }
                }
                failedSearchResultIds.addAll(missedNzbs.stream().map(SearchResultEntity::getId).collect(Collectors.toSet()));
                return new AddNzbsResponse(false, message, addedNzbs, failedSearchResultIds);
            }
        }

        // Combine failedSearchResultIds with missedNzb IDs
        failedSearchResultIds.addAll(missedNzbs.stream().map(SearchResultEntity::getId).collect(Collectors.toSet()));

        if (missedNzbs.isEmpty() && failedSearchResultIds.isEmpty()) {
            return new AddNzbsResponse(true, null, addedNzbs, Collections.emptyList());
        } else {
            logger.debug("At least one NZB was not downloaded successfully or could not be added to the downloader");
            String message = "";
            if (!missedNzbs.isEmpty()) {
                message = "NZBs for the following titles could not be downloaded or added:\r\n" +
                          missedNzbs.stream().map(SearchResultEntity::getTitle).collect(Collectors.joining(", "));
            }
            if (!failedSearchResultIds.isEmpty() && missedNzbs.isEmpty()) {
                message = "Some search results could not be processed";
            }
            return new AddNzbsResponse(true, message, addedNzbs, new ArrayList<>(failedSearchResultIds));
        }
    }

    protected NzbAddingType getNzbAddingType(DownloadType downloadType, SearchResultEntity searchResult) {
        return downloaderConfig.getNzbAddingType();
    }


    public abstract GenericResponse checkConnection();

    public abstract List<String> getCategories();

    /**
     * @param link         Link to the NZB
     * @param title        Title to tell the downloader
     * @param downloadType
     * @param category     Category to file under
     * @return ID returned by the downloader
     * @throws DownloaderException Error while downloading
     */
    public abstract String addLink(String link, String title, DownloadType downloadType, String category) throws DownloaderException;

    /**
     * @param content      NZB content to upload
     * @param title        Title to tell the downloader
     * @param downloadType
     * @param category     Category to file under
     * @return ID returned by the downloader
     * @throws DownloaderException Error while downloading
     */
    public abstract String addContent(byte[] content, String title, DownloadType downloadType, String category) throws DownloaderException;

    public abstract DownloaderStatus getStatus() throws DownloaderException;

    public List<FileDownloadEntity> checkForStatusUpdates(List<FileDownloadEntity> downloads, StatusCheckType statusCheckType) {
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Checking {} history for updates to downloaded statuses", downloaderConfig.getName());
        Stopwatch stopwatch = Stopwatch.createStarted();
        if (downloads.isEmpty()) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "No downloades in history");
            return Collections.emptyList();
        }
        Instant earliestDownload = Iterables.getLast(downloads).getTime();
        List<FileDownloadEntity> updatedDownloads = new ArrayList<>();
        try {
            List<DownloaderEntry> downloaderEntries;
            if (statusCheckType == StatusCheckType.HISTORY) {
                downloaderEntries = getHistory(earliestDownload);
            } else {
                downloaderEntries = getQueue(earliestDownload);
            }
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Found {} downloader history entries", downloaderEntries.size());
            Set<FileDownloadEntity> matchedDownloads = new HashSet<>();
            Set<DownloaderEntry> matchedEntries = new HashSet<>();
            for (FileDownloadEntity download : downloads) {
                for (DownloaderEntry entry : downloaderEntries) {
                    if (download.getSearchResult() == null) {
                        continue;
                    }
                    if (isDownloadMatchingDownloaderEntry(download, entry)) {
                        matchedDownloads.add(download);
                        matchedEntries.add(entry);
                        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Found match between download and downloader entry with title {}", entry.getNzbName());
                        FileDownloadStatus newStatus = getDownloadStatusFromDownloaderEntry(entry, statusCheckType);
                        if (newStatus == null) {
                            //Could be any status that we're not prepared for
                            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Unable to map downloader status {}", entry.getStatus());
                            continue;
                        }
                        if ((download.getStatus() == FileDownloadStatus.NONE || download.getStatus() == FileDownloadStatus.REQUESTED) && download.getExternalId() == null && statusCheckType == StatusCheckType.QUEUE) {
                            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Current download status is {} and no downloader ID was set. Setting ID {} now", entry.getStatus(), entry.getNzbId());
                            //Setting the external ID will make it better identifiable in the history later and make false positives less likely
                            download.setExternalId(String.valueOf(entry.getNzbId()));
                        }
                        if (newStatus.canUpdate(download.getStatus())) {
                            download.setStatus(newStatus);
                            updatedDownloads.add(download);
                            logger.info("Updating download status for {} to {}", entry.getNzbName(), newStatus);
                        }
                        if (newStatus.isFinal()) {
                            logger.debug(LoggingMarkers.NOTIFICATIONS, "Throwing notification for final download status {} of {}", newStatus, entry.getNzbName());
                            applicationEventPublisher.publishEvent(new DownloadCompletionNotificationEvent(entry.getNzbName(), newStatus.humanize()));
                        }
                    }
                }

            }
            Sets.SetView<FileDownloadEntity> unmatchedDownloads = Sets.difference(new HashSet<>(downloads), matchedDownloads);
            if (!unmatchedDownloads.isEmpty()) {
                logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Unable to find downloader entries for these downloads: {}", Joiner.on(", ").join(unmatchedDownloads));
            }
            Sets.SetView<DownloaderEntry> unmatchedEntries = Sets.difference(new HashSet<>(downloaderEntries), matchedEntries);
            if (!unmatchedEntries.isEmpty()) {
                logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Unable to find downloads for these downloader entries: {}", Joiner.on(", ").join(unmatchedEntries));
            }

            logger.debug(LoggingMarkers.PERFORMANCE, "Took {}ms to check download status updates for {} downloads in the database and {} entries from {} {}", stopwatch.elapsed(TimeUnit.MILLISECONDS), downloads.size(), downloaderEntries.size(), downloaderConfig.getName(), statusCheckType);
        } catch (DownloaderException e) {
            logger.warn("Unable to contact downloader {}: {}", downloaderConfig.getName(), e.getMessage());
        } catch (Throwable throwable) {
            logger.error("Error while trying to update download statuses", throwable);
        }
        return updatedDownloads;
    }

    protected void addDownloadRate(long downloadRateKb) {
        if (downloadRates.size() >= 300) {
            downloadRates.remove(0);
        }
        downloadRates.add(downloadRateKb);
    }

    public abstract List<DownloaderEntry> getHistory(Instant earliestDownload) throws DownloaderException;

    public abstract List<DownloaderEntry> getQueue(Instant earliestDownload) throws DownloaderException;

    protected abstract FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType);

    boolean isDownloadMatchingDownloaderEntry(FileDownloadEntity download, DownloaderEntry entry) {
        if (download.getExternalId() != null) {
            boolean idMatches = download.getExternalId() != null && download.getExternalId().equals(entry.getNzbId());
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Trying to match downloader entry {} with download {}. Id match: {}. ", entry, download, idMatches);
            return idMatches;
        }
        if (guidExternalIds.containsKey(download.getSearchResult().getId())) {
            boolean idFromMapMatches = guidExternalIds.containsKey(download.getSearchResult().getId()) && guidExternalIds.get(download.getSearchResult().getId()).equals(entry.getNzbId());
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Trying to match downloader entry {} with download {}. Id map match: {}. ", entry, download, idFromMapMatches);
            return idFromMapMatches;
        }

        if (download.getSearchResult().getTitle() == null) {
            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Unable to match downloader entry {} with download {} without title ", entry, download);
            return false;
        }
        //Remove any special characters that might've been removed by the downloader
        String downloadTitleCleaned = download.getSearchResult().getTitle().replaceAll("[^a-zA-Z0-9 _\\-]", "");
        String entryTitleCleaned = entry.getNzbName().replaceAll("[^a-zA-Z0-9 _\\-]", "");
        boolean nameMatches = downloadTitleCleaned.equalsIgnoreCase(entryTitleCleaned);
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Trying to match downloader entry {} with download {}. Name match: {}. ", entry, download, nameMatches);
        return nameMatches;
    }

    public String getUrl() {
        return downloaderConfig.getUrl();
    }

    protected String suffixNzbToTitle(String title) {
        if (!title.toLowerCase().endsWith(".nzb")) {
            title += ".nzb";
        }
        return title;
    }
}
