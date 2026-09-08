package org.nzbhydra.mockserver.newznab;

import org.springframework.http.ResponseEntity;

/**
 * Builds the response for a matched {@link Scenario}.
 */
@FunctionalInterface
public interface ResponseBehaviour {

    ResponseEntity<?> respond(MockContext context) throws Exception;

}
