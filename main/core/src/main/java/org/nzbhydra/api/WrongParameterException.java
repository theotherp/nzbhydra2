package org.nzbhydra.api;

public class WrongParameterException extends ExternalApiException {

    public WrongParameterException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return "201";
    }
}
