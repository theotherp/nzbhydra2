package org.nzbhydra.api;

public class InvalidGuidException extends ExternalApiException {

    public InvalidGuidException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return "300";
    }
}
