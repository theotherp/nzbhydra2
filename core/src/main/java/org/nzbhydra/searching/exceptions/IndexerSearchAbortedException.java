package org.nzbhydra.searching.exceptions;

import org.nzbhydra.NzbHydraException;

/**
 * Thrown when preparations for the search could not be executed for reasons that are neither the indexer's not Hydra's fault
 */
public class IndexerSearchAbortedException extends NzbHydraException {

    public IndexerSearchAbortedException(String message) {
        super(message);
    }


}
