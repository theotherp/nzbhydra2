package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.NewznabParameters;

/**
 * Decides whether a scenario is responsible for a request. Implementations must be null safe for every parameter.
 */
@FunctionalInterface
public interface RequestMatcher {

    boolean matches(NewznabParameters parameters);

}
