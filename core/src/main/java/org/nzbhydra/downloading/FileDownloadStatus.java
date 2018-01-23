package org.nzbhydra.downloading;

import java.util.Arrays;

public enum FileDownloadStatus {

    /**
     * When no status exists yet
     */
    NONE(),

    /**
     * when a redirect was requsted
     */
    REQUESTED(NONE),

    /**
     * when an error occured while downloading the NZB from the indexer or getting the metadata
     */
    INTERNAL_ERROR(NONE, REQUESTED),

    /**
     * when the NZB file was downloaded successfully by hydra
     */
    NZB_DOWNLOAD_SUCCESSFUL(NONE, REQUESTED),
    /**
     * when the NZB file could not be downloaded by hydra
     */
    NZB_DOWNLOAD_ERROR(NONE, REQUESTED),

    /**
     * when the NZB was added to the queue by the downloader
     */
    NZB_ADDED(NONE, REQUESTED, NZB_DOWNLOAD_SUCCESSFUL),
    /**
     * Not added for some reason
     */
    NZB_NOT_ADDED(NONE, REQUESTED, NZB_DOWNLOAD_SUCCESSFUL),
    /**
     * when the downloader downloaded the NZB but couldn't add it to the queue (invalid content, for example)
     */
    NZB_ADD_ERROR(NONE, REQUESTED, NZB_DOWNLOAD_SUCCESSFUL),
    /**
     * When the downloader rejected adding the NZB (specificallly when nzbget says "NZB_DELETED"
     */
    NZB_ADD_REJECTED(NONE, REQUESTED, NZB_DOWNLOAD_SUCCESSFUL),

    /**
     * when the content of the actual download was successful
     */
    CONTENT_DOWNLOAD_SUCCESSFUL(NONE, REQUESTED, NZB_ADDED, NZB_DOWNLOAD_SUCCESSFUL),
    /**
     * When the downloader was unable to download the NZB's content
     */
    CONTENT_DOWNLOAD_ERROR(NONE, REQUESTED, NZB_ADDED, NZB_DOWNLOAD_SUCCESSFUL),
    /**
     * When the downloader produces a warning during the processing
     */
    CONTENT_DOWNLOAD_WARNING(NONE, REQUESTED, NZB_ADDED, NZB_DOWNLOAD_SUCCESSFUL);

    private final FileDownloadStatus[] canUpdate;


    FileDownloadStatus(FileDownloadStatus... canUpdate) {
        this.canUpdate = canUpdate;
    }

    public boolean canUpdate(FileDownloadStatus status) {
        return Arrays.asList(this.canUpdate).contains(status);
    }
}
