package org.nzbhydra.searching.infos;

public class InfoProviderException extends Exception {

    public InfoProviderException(String message) {
        super(message);
    }

    public InfoProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
