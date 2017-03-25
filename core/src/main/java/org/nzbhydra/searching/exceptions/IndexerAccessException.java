package org.nzbhydra.searching.exceptions;

import org.nzbhydra.NzbHydraException;

public class IndexerAccessException extends NzbHydraException {

    public IndexerAccessException(String message) {
        super(message);
    }

    public IndexerAccessException() {
        super();
    }

    public IndexerAccessException(String message, Throwable cause) {
        super(message, cause);
    }

    public IndexerAccessException(Throwable cause) {
        super(cause);
    }

}
