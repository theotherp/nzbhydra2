package org.nzbhydra.searching.exceptions;

public class IndexerUnreachableException extends IndexerAccessException {


    public IndexerUnreachableException(String message) {
        super(message);
    }

    public IndexerUnreachableException() {
        super();
    }

    public IndexerUnreachableException(String message, Throwable cause) {
        super(message, cause);
    }

    public IndexerUnreachableException(Throwable cause) {
        super(cause);
    }
}
