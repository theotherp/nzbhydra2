package org.nzbhydra.indexers.exceptions;

public class IndexerAuthException extends IndexerAccessException {

    public IndexerAuthException(String message) {
        super(message);
    }

    public IndexerAuthException() {
        super();
    }

    public IndexerAuthException(String message, Throwable cause) {
        super(message, cause);
    }

    public IndexerAuthException(Throwable cause) {
        super(cause);
    }
}
