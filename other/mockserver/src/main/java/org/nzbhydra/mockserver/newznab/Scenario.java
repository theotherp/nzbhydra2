package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.NewznabParameters;

/**
 * One mock behaviour, triggered by one recognizable kind of request.
 */
public record Scenario(String id, String description, RequestMatcher matcher, ResponseBehaviour behaviour) {

    public boolean matches(NewznabParameters parameters) {
        return matcher.matches(parameters);
    }

    /**
     * Delay scenarios do not answer the request, they only slow it down and let the registry continue.
     */
    public boolean isTerminating() {
        return !(behaviour instanceof DelayBehaviour);
    }

}
