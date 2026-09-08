package org.nzbhydra.mockserver.newznab;

import org.springframework.http.ResponseEntity;

import java.time.Duration;

/**
 * A non-terminating behaviour: it only sleeps and lets the registry continue looking for a scenario that answers the
 * request. This models the sleep branches of the original if chain, which fell through into the later branches.
 */
@FunctionalInterface
public interface DelayBehaviour extends ResponseBehaviour {

    Duration duration(MockContext context);

    @Override
    default ResponseEntity<?> respond(MockContext context) throws Exception {
        context.sleeper().sleep(duration(context));
        return null;
    }

}
