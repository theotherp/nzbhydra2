package org.nzbhydra.searching;

import org.nzbhydra.searching.exceptions.IndexerAccessException;

public class UnknownResponseException extends IndexerAccessException {

    public UnknownResponseException(String message) {
        super(message);
    }
}
