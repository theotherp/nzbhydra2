package org.nzbhydra.downloading.exceptions;

import org.springframework.web.client.RestClientException;

public class DownloaderUnreachableException extends DownloaderException {
    public DownloaderUnreachableException(String message) {
        super(message);
    }

    public DownloaderUnreachableException(String message, RestClientException throwable) {
        super(message, throwable);
    }
}
