

package org.nzbhydra.downloading;

public class InvalidSearchResultIdException extends Exception {

    private boolean internal;

    public InvalidSearchResultIdException(long searchResultId, boolean internal) {
        super("Unable to find search result with ID " + searchResultId);
        this.internal = internal;
    }

    public boolean isInternal() {
        return internal;
    }
}
