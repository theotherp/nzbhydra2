package org.nzbhydra.indexers.exceptions;


/**
 * Thrown when the search is aborted because hydra was unable to convert to any usable IDs.
 */
public class IndexerNoIdConversionPossibleException extends IndexerSearchAbortedException {

    public IndexerNoIdConversionPossibleException(String message) {
        super(message);
    }


}
