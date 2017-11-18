package org.nzbhydra.api;

public class WrongApiKeyException extends ExternalApiException {

    public WrongApiKeyException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return "100";
    }


}
