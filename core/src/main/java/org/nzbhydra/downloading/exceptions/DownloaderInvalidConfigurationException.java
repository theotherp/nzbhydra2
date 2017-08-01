package org.nzbhydra.downloading.exceptions;

import org.nzbhydra.NzbHydraException;

public class DownloaderInvalidConfigurationException extends NzbHydraException {

    public DownloaderInvalidConfigurationException(String message) {
        super(message);
    }

    public DownloaderInvalidConfigurationException(String message, Throwable cause) {
        super(message, cause);
    }
}
