package org.nzbhydra.indexers.exceptions;

import org.nzbhydra.NzbHydraException;

/**
 * Thrown when any error occurred while contacting the indexer.
 */
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
