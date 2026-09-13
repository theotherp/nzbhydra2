

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
import org.nzbhydra.downloading.DownloadIdentifier;
import org.nzbhydra.downloading.DownloadResult;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.InvalidSearchResultIdException;
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

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
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
    private final List<Long> downloadRates = new ArrayList<>();

    /**
     * How long an unreachable downloader is left unlogged after the first error was logged.
     */
    private static final Duration STATUS_ERROR_LOG_INTERVAL = Duration.ofMinutes(10);
    private final Object statusErrorLock = new Object();
    private Instant lastStatusErrorLogged;

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
        AddNzbsResults results = new AddNzbsResults();

        for (int i = 0; i < searchResults.size(); i++) {
            AddFilesRequest.SearchResult entry = searchResults.get(i);
            try {
                addSearchResult(entry, category, results);
            } catch (InvalidSearchResultIdException | EntityNotFoundException e) {
                logger.error("Unable to find the search result in the database for ID: {}", entry.getSearchResultId());
                addParsedSearchResultId(entry.getSearchResultId(), results);
            } catch (DownloaderException e) {
                // DownloaderException indicates a downloader-wide issue, so we stop processing
                logger.error("Downloader error: {}", e.getMessage());
                //Everything from the current entry onwards is unprocessed. Entries before it were already sorted into one of the buckets
                return buildAbortedResponse(e, searchResults.subList(i, searchResults.size()), results);
            }
        }

        return buildResponse(results);
    }

    /**
     * Resolves one requested search result and hands it to the downloader.
     *
     * @throws InvalidSearchResultIdException when the requested identifier cannot be parsed
     * @throws DownloaderException            when the downloader itself failed, meaning no further results should be sent to it
     */
    private void addSearchResult(AddFilesRequest.SearchResult entry, String category, AddNzbsResults results) throws InvalidSearchResultIdException, DownloaderException {
        DownloadIdentifier downloadIdentifier = DownloadIdentifier.parse(entry.getSearchResultId(), true);
        Long guid = downloadIdentifier.searchResultId();
        String categoryToSend = determineCategoryToSend(entry, category);

        Optional<SearchResultEntity> optionalResult = searchResultRepository.findByHash(guid);
        if (optionalResult.isEmpty()) {
            logger.error("Download request with invalid/outdated GUID {}", guid);
            results.failedSearchResultIds.add(guid);
            return;
        }
        final SearchResultEntity searchResult = optionalResult.get();
        searchResult.setDownloadSearchId(downloadIdentifier.searchId());
        try {
            sendToDownloader(searchResult, guid, categoryToSend, results);
        } catch (DuplicateNzbException e) {
            results.missedNzbs.add(searchResult);
        }
    }

    private String determineCategoryToSend(AddFilesRequest.SearchResult entry, String category) {
        if ("Use original category".equals(category)) {
            if ("N/A".equals(entry.getOriginalCategory())) {
                logger.info("Using mapped category {} because the original category is N/A", entry.getMappedCategory());
                return entry.getMappedCategory();
            }
            return entry.getOriginalCategory();
        }
        if ("Use mapped category".equals(category)) {
            return entry.getMappedCategory();
        }
        if ("Use no category".equals(category)) {
            return null;
        }
        return category;
    }

    private void sendToDownloader(SearchResultEntity searchResult, Long guid, String categoryToSend, AddNzbsResults results) throws DownloaderException {
        final IndexerConfig indexerConfig = configProvider.getIndexerByName(searchResult.getIndexer().getName());
        NzbAddingType addingType = getNzbAddingType(searchResult.getDownloadType(), searchResult);
        final FileDownloadAccessType accessTypeForIndexer = indexerSpecificDownloadExceptions.getAccessTypeForIndexer(indexerConfig, configProvider.getBaseConfig().getDownloading().getNzbAccessType(), searchResult);
        if (addingType == NzbAddingType.UPLOAD && accessTypeForIndexer == FileDownloadAccessType.PROXY) {
            logger.debug("Adding type UPLOAD and file download access type PROXY for downloader {} and indexer {}", getName(), indexerConfig.getName());
            // As we need to get the NZB and send it to the downloader there's no difference between redirect or proxy
            DownloadResult result = fileHandler.getFileByResult(FileDownloadAccessType.PROXY, SearchSource.INTERNAL, searchResult); //Uploading NZBs can only be done via proxying
            if (result.isSuccessful()) {
                String externalId = addContent(result.getContent(), result.getTitle(), searchResult.getDownloadType(), categoryToSend);
                result.getDownloadEntity().setExternalId(externalId);
                fileHandler.updateStatusByEntity(result.getDownloadEntity(), FileDownloadStatus.NZB_ADDED);
                results.addedNzbs.add(guid);
            } else {
                results.missedNzbs.add(searchResult);
            }
        } else {
            logger.debug("Adding type SEND_LINK for downloader {} and indexer {}", getName(), indexerConfig.getName());
            //Adding type is SEND_LINK or indexer requires a redirect or even sending the direct link
            //In any case we send a link, either to us or to the indexer
            DownloadLink link = downloadUrlBuilder.getDownloadLinkForSendingToDownloader(searchResult, false);

            String externalId = addLink(link.link(), searchResult.getTitle(), searchResult.getDownloadType(), categoryToSend);
            if (externalId != null) {
                //A null value would make isDownloadMatchingDownloaderEntry throw for every later status update
                guidExternalIds.put(guid, externalId);
            }
            results.addedNzbs.add(guid);

            //Ideally we would add the download and set it to failed after an exception but that is too much work
            if (!link.isInternal()) {
                logger.debug("Saving download for sending an external link to the downloader");
                //We're sending an external link to the downloader and will never hear back about that so we need to store this as a download
                fileHandler.handleRedirect(SearchSource.INTERNAL, searchResult, link.link());
            }
        }
    }

    private AddNzbsResponse buildAbortedResponse(DownloaderException e, List<AddFilesRequest.SearchResult> unprocessedEntries, AddNzbsResults results) {
        String message = e.getMessage();
        if (!results.addedNzbs.isEmpty()) {
            message += ".\n" + results.addedNzbs.size() + " were added successfully before the error";
        }
        for (AddFilesRequest.SearchResult unprocessedEntry : unprocessedEntries) {
            addParsedSearchResultId(unprocessedEntry.getSearchResultId(), results);
        }
        results.mergeMissedNzbsIntoFailedIds();
        return new AddNzbsResponse(false, message, results.addedNzbs, results.failedSearchResultIds, results.invalidIds);
    }

    private AddNzbsResponse buildResponse(AddNzbsResults results) {
        results.mergeMissedNzbsIntoFailedIds();

        if (results.missedNzbs.isEmpty() && results.failedSearchResultIds.isEmpty() && results.invalidIds.isEmpty()) {
            return new AddNzbsResponse(true, null, results.addedNzbs, Collections.emptyList());
        }
        logger.debug("At least one NZB was not downloaded successfully or could not be added to the downloader");
        return new AddNzbsResponse(!results.addedNzbs.isEmpty(), buildFailureMessage(results), results.addedNzbs, new ArrayList<>(results.failedSearchResultIds), results.invalidIds);
    }

    /**
     * Builds the message shown to the user. Every kind of failure that occurred is reported, not just the last one.
     */
    private String buildFailureMessage(AddNzbsResults results) {
        List<String> messages = new ArrayList<>();
        if (!results.missedNzbs.isEmpty()) {
            messages.add("NZBs for the following titles could not be downloaded or added:\r\n" +
                         results.missedNzbs.stream().map(SearchResultEntity::getTitle).collect(Collectors.joining(", ")));
        } else if (!results.failedSearchResultIds.isEmpty()) {
            messages.add("Some search results could not be processed");
        }
        if (!results.invalidIds.isEmpty()) {
            messages.add("Some download identifiers were invalid");
        }
        return String.join("\r\n", messages);
    }

    private void addParsedSearchResultId(String identifier, AddNzbsResults results) {
        try {
            long searchResultId = DownloadIdentifier.parse(identifier, true).searchResultId();
            if (!results.addedNzbs.contains(searchResultId) && !results.failedSearchResultIds.contains(searchResultId)) {
                results.failedSearchResultIds.add(searchResultId);
            }
        } catch (InvalidSearchResultIdException e) {
            logger.error("Unable to parse download identifier {}", identifier);
            results.invalidIds.add(identifier);
        }
    }

    /**
     * The buckets a requested search result can end up in while {@link #addBySearchResultIds(List, String)} runs.
     */
    private static class AddNzbsResults {
        private final Set<Long> addedNzbs = new HashSet<>();
        private final Set<SearchResultEntity> missedNzbs = new HashSet<>();
        private final Set<Long> failedSearchResultIds = new HashSet<>();
        private final Set<String> invalidIds = new LinkedHashSet<>();

        private void mergeMissedNzbsIntoFailedIds() {
            failedSearchResultIds.addAll(missedNzbs.stream().map(SearchResultEntity::getHash).collect(Collectors.toSet()));
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

    /**
     * Called by a downloader after a status request succeeded so that the next failure is logged again.
     */
    protected void resetStatusErrorThrottle() {
        synchronized (statusErrorLock) {
            lastStatusErrorLogged = null;
        }
    }

    /**
     * Shared fallback for a failed status request: the error is logged at most once per {@link #STATUS_ERROR_LOG_INTERVAL}
     * (using the calling downloader's own logger and message, so log output is unchanged) and an OFFLINE status with a
     * recorded download rate of zero is returned.
     */
    protected DownloaderStatus handleStatusRequestError(Logger downloaderLogger, String errorMessage, Throwable error) {
        synchronized (statusErrorLock) {
            if (lastStatusErrorLogged == null || lastStatusErrorLogged.isBefore(Instant.now().minus(STATUS_ERROR_LOG_INTERVAL))) {
                downloaderLogger.error(errorMessage, error);
                lastStatusErrorLogged = Instant.now();
            }
        }
        DownloaderStatus status = new DownloaderStatus();
        status.setState(DownloaderStatus.State.OFFLINE);
        addDownloadRate(0);
        return status;
    }

    protected void addDownloadRate(long downloadRateKb) {
        synchronized (downloadRates) {
            if (downloadRates.size() >= 300) {
                downloadRates.remove(0);
            }
            downloadRates.add(downloadRateKb);
        }
    }

    /**
     * Returns the recorded download rates. The internal list is written by the status update scheduler while the
     * returned list may be serialized by another thread, so a snapshot is returned.
     */
    protected List<Long> getDownloadRates() {
        synchronized (downloadRates) {
            return List.copyOf(downloadRates);
        }
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
        if (guidExternalIds.containsKey(download.getSearchResult().getHash())) {
            boolean idFromMapMatches = guidExternalIds.containsKey(download.getSearchResult().getHash()) && guidExternalIds.get(download.getSearchResult().getHash()).equals(entry.getNzbId());
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
