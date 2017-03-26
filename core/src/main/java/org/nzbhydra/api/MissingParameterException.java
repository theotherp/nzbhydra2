package org.nzbhydra.api;

public class MissingParameterException extends ExternalApiException {

    public MissingParameterException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return "200";
    }
}
