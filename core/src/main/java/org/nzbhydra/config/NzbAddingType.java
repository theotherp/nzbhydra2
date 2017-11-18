package org.nzbhydra.config;

/**
 * Defines in which way NZBs are added to a downloader: By uploading NZB content or sending a URL to an NZB.
 */
public enum NzbAddingType {
    UPLOAD,
    SEND_LINK
}
