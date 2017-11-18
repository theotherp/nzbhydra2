package org.nzbhydra.update;

import org.nzbhydra.NzbHydraException;

public class UpdateException extends NzbHydraException {

    public UpdateException(String message) {
        super(message);
    }

    public UpdateException(String message, Throwable cause) {
        super(message, cause);
    }
}
