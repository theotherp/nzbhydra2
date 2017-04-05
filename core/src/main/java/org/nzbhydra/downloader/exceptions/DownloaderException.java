package org.nzbhydra.downloader.exceptions;

import org.nzbhydra.NzbHydraException;

public class DownloaderException extends NzbHydraException {

    public DownloaderException(String message) {
        super(message);
    }

    public DownloaderException(String message, Throwable cause) {
        super(message, cause);
    }
}
