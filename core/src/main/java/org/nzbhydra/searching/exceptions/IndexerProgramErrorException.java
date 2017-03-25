package org.nzbhydra.searching.exceptions;

/**
 * Thrown when an error occurrs that indicates an error in the program code :-(
 */
public class IndexerProgramErrorException extends IndexerAccessException {

    public IndexerProgramErrorException(String message) {
        super(message);
    }

    public IndexerProgramErrorException(Exception e) {

    }

    public IndexerProgramErrorException(String message, Throwable cause) {
        super(message, cause);
    }
}
