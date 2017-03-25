package org.nzbhydra.api;

import org.nzbhydra.NzbHydraException;

public abstract class ExternalApiException extends NzbHydraException {

    public ExternalApiException() {
        super();
    }

    public ExternalApiException(String message) {
        super(message);
    }

    public ExternalApiException(String message, Throwable cause) {
        super(message, cause);
    }

    public ExternalApiException(Throwable cause) {
        super(cause);
    }

    public abstract String getStatusCode();
}
