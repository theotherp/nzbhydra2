package org.nzbhydra;

public class NzbHydraException extends Exception {

    public NzbHydraException() {
        super();
    }

    public NzbHydraException(String message) {
        super(message);
    }

    public NzbHydraException(String message, Throwable cause) {
        super(message, cause);
    }

    public NzbHydraException(Throwable cause) {
        super(cause);
    }


}
