package org.nzbhydra.indexers.exceptions;

/**
 * Thrown when the indexer result could not be parsed properly
 */
public class IndexerParsingException extends IndexerAccessException {

    public IndexerParsingException(String message) {
        super(message);
    }

    public IndexerParsingException(String message, Throwable cause) {
        super(message, cause);
    }
}
