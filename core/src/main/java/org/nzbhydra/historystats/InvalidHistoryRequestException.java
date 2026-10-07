package org.nzbhydra.historystats;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thrown when a {@link org.nzbhydra.historystats.stats.HistoryRequest} names a column that is not on the allow-list
 * of the requested history table or carries a value that cannot be bound as the expected type. Results in a 400.
 */
public class InvalidHistoryRequestException extends ResponseStatusException {

    public InvalidHistoryRequestException(String reason) {
        super(HttpStatus.BAD_REQUEST, reason);
    }
}
