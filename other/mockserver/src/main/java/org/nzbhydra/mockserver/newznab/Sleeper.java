package org.nzbhydra.mockserver.newznab;

import java.time.Duration;

/**
 * Indirection for the mock server's artificial delays so that tests can assert on them without actually sleeping.
 */
@FunctionalInterface
public interface Sleeper {

    Sleeper REAL = duration -> {
        if (!duration.isZero() && !duration.isNegative()) {
            Thread.sleep(duration.toMillis());
        }
    };

    void sleep(Duration duration) throws InterruptedException;

}
