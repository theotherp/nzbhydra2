package org.nzbhydra.api;

public class WrongApiKeyException extends IllegalAccessException {

    public WrongApiKeyException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return "100";
    }


}
