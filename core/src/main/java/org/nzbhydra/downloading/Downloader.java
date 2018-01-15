package org.nzbhydra.downloading;

import com.google.common.base.MoreObjects;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.collect.Iterables;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.config.NzbAddingType;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultRepository;
import org.nzbhydra.searching.SearchResultWebTO;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public abstract class Downloader {

    private static final Logger logger = LoggerFactory.getLogger(Downloader.class);

    public enum StatusCheckType {
        QUEUE,
        HISTORY
    }

    @Autowired
    protected NzbHandler nzbHandler;
    @Autowired
    protected SearchResultRepository searchResultRepository;

    protected DownloaderConfig downloaderConfig;

    public void intialize(DownloaderConfig downloaderConfig) {
        this.downloaderConfig = downloaderConfig;
    }

    public boolean isEnabled() {
        return downloaderConfig != null && downloaderConfig.isEnabled();
    }

    @Transactional
    public AddNzbsResponse addBySearchResultIds(List<SearchResultWebTO> searchResults, String category) {
        NzbAddingType addingType = downloaderConfig.getNzbAddingType();
        List<Long> addedNzbs = new ArrayList<>();
        try {
            for (SearchResultWebTO entry : searchResults) {
                Long guid = Long.valueOf(entry.getSearchResultId());
                String categoryToSend = Strings.isNullOrEmpty(category) ? entry.getOriginalCategory() : category;
                if (addingType == NzbAddingType.UPLOAD) {
                    NzbDownloadResult result = nzbHandler.getNzbByGuid(guid, NzbAccessType.PROXY, SearchSource.INTERNAL); //Uploading NZBs can only be done via proxying
                    String externalId = addNzb(result.getNzbContent(), result.getTitle(), categoryToSend);
                    result.getDownloadEntity().setExternalId(externalId);
                    nzbHandler.updateStatusByEntity(result.getDownloadEntity(), NzbDownloadStatus.NZB_ADDED);
                } else {
                    SearchResultEntity searchResultEntity = searchResultRepository.getOne(guid);
                    addLink(nzbHandler.getNzbDownloadLink(guid, false, DownloadType.NZB), searchResultEntity.getTitle(), categoryToSend);
                }
                addedNzbs.add(guid);
            }

        } catch (InvalidSearchResultIdException | DownloaderException e) {
            String message;
            if (e instanceof DownloaderException) {
                message = "Error while adding NZB(s) to downloader: " + e.getMessage();
            } else {
                message = e.getMessage();
            }
            logger.error(message);
            if (!addedNzbs.isEmpty()) {
                message += ".\n" + addedNzbs.size() + " were added successfully";
            }
            Set<Long> searchResultIds = Sets.newHashSet(searchResults.stream().map(x -> Long.valueOf(x.getSearchResultId())).collect(Collectors.toSet()));
            searchResultIds.removeAll(addedNzbs);
            return new AddNzbsResponse(false, message, addedNzbs, searchResultIds);
        }
        return new AddNzbsResponse(true, null, addedNzbs, Collections.emptyList());
    }


    public abstract GenericResponse checkConnection();

    public abstract List<String> getCategories();

    /**
     * @param link     Link to the NZB
     * @param title    Title to tell the downloader
     * @param category Category to file under
     * @return ID returned by the downloader
     * @throws DownloaderException
     */
    public abstract String addLink(String link, String title, String category) throws DownloaderException;

    /**
     * @param content  NZB content to upload
     * @param title    Title to tell the downloader
     * @param category Category to file under
     * @return ID returned by the downloader
     * @throws DownloaderException
     */
    public abstract String addNzb(String content, String title, String category) throws DownloaderException;

    public List<NzbDownloadEntity> checkForStatusUpdates(List<NzbDownloadEntity> downloads, StatusCheckType statusCheckType) {
        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Checking {} history for updates to downloaded statuses", downloaderConfig.getName());
        Stopwatch stopwatch = Stopwatch.createStarted();
        if (downloads.isEmpty()) {
            return Collections.emptyList();
        }
        Instant earliestDownload = Iterables.getLast(downloads).getTime();
        List<NzbDownloadEntity> updatedDownloads = new ArrayList<>();
        try {
            List<DownloaderEntry> downloaderEntries;
            if (statusCheckType == StatusCheckType.HISTORY) {
                downloaderEntries = getHistory(earliestDownload);
            } else {
                downloaderEntries = getQueue(earliestDownload);
            }
            for (NzbDownloadEntity download : downloads) {
                for (DownloaderEntry entry : downloaderEntries) {
                    if (download.getSearchResult() == null) {
                        continue;
                    }
                    if (isDownloadMatchingDownloaderEntry(download, entry)) {
                        logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Found match between download and downloader entry with title", entry.getNzbName());
                        NzbDownloadStatus newStatus = getDownloadStatusFromDownloaderEntry(entry, statusCheckType);
                        if (newStatus == null) {
                            //Could be any status that we're not prepared for
                            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Unable to map downloader status {}", entry.getStatus());
                            continue;
                        }
                        if ((download.getStatus() == NzbDownloadStatus.NONE || download.getStatus() == NzbDownloadStatus.REQUESTED) && download.getExternalId() == null && statusCheckType == StatusCheckType.QUEUE) {
                            logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Current download status is {} and no downloader ID was set. Setting ID {} now", entry.getStatus(), entry.getNzbId());
                            //Setting the external ID will make it better identifiable in the history later and make false positives less likely
                            download.setExternalId(String.valueOf(entry.getNzbId()));
                        }
                        if (newStatus.canUpdate(download.getStatus())) {
                            download.setStatus(newStatus);
                            updatedDownloads.add(download);
                            logger.info("Updating download status for {} to {}", entry.getNzbName(), newStatus);
                        }
                    }
                }
            }

            logger.debug(LoggingMarkers.PERFORMANCE, "Took {}ms to check download status updates for {} downloads in the database and {} entries from {} history", stopwatch.elapsed(TimeUnit.MILLISECONDS), downloads.size(), downloaderEntries.size(), downloaderConfig.getName());
        } catch (DownloaderException e) {
            logger.warn(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Unable to contact downloader {}: ", downloaderConfig.getName(), e.getMessage());
        }
        catch (Throwable throwable) {
            logger.error("Error while trying to update download statuses", throwable);
        }
        return updatedDownloads;
    }

    public abstract List<DownloaderEntry> getHistory(Instant earliestDownload) throws DownloaderException;

    public abstract List<DownloaderEntry> getQueue(Instant earliestDownload) throws DownloaderException;

    protected abstract NzbDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType);

    protected abstract boolean isDownloadMatchingDownloaderEntry(NzbDownloadEntity download, DownloaderEntry entry);

    @Data
    @AllArgsConstructor
    public class AddNzbsResponse {
        private boolean successful;
        private String message;
        private Collection<Long> addedIds;
        private Collection<Long> missedIds;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    protected static class DownloaderEntry {
        private String nzbId;
        private String nzbName;
        private String status;
        private Instant time;

        @Override
        public String toString() {
            return MoreObjects.toStringHelper(this)
                    .add("nzbId", nzbId)
                    .add("nzbName", nzbName)
                    .toString();
        }
    }


}
