package org.nzbhydra.searching.exceptions;

/**
 * Thrown when the indexer could not be reached at all, i.e. because of a timeout.
 */
public class IndexerUnreachableException extends IndexerAccessException {

    public IndexerUnreachableException(String message) {
        super(message);
    }


}
