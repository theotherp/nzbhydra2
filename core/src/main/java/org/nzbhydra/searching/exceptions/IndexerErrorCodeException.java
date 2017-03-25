package org.nzbhydra.searching.exceptions;

import org.nzbhydra.rssmapping.RssError;

/**
 * Thrown when the indexer returns an error code that is not handled specifically (e.g. not an auth problem)
 */
public class IndexerErrorCodeException extends IndexerAccessException {
    public IndexerErrorCodeException(RssError response) {
        super(String.format("Indexer returned with error code %s and description %s", response.getCode(), response.getDescription()));
    }
}
