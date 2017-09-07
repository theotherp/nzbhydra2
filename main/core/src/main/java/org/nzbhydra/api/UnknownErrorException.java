package org.nzbhydra.api;

public class UnknownErrorException extends ExternalApiException {

    public UnknownErrorException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return null;
    }
}
