

package org.nzbhydra.config.downloading;

/**
 * Defines how an NZB download from Hydra is handled: Via redirecting to the original indexer or by proxying the actual NZB content.
 */
public enum FileDownloadAccessType {
    REDIRECT,
    PROXY
}
