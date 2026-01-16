

package org.nzbhydra.api;

public class IllegalAccessException extends ExternalApiException {

    public IllegalAccessException(String message) {
        super(message);
    }

    @Override
    public String getStatusCode() {
        return "100";
    }


}
