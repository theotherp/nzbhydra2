package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.ActionAttribute;

import java.util.Arrays;

/**
 * Null safe combinators used to build {@link RequestMatcher}s.
 */
public final class Match {

    private Match() {
    }

    public static RequestMatcher query(String query) {
        return parameters -> query.equals(parameters.getQ());
    }

    public static RequestMatcher queryStartsWith(String prefix) {
        return parameters -> parameters.getQ() != null && parameters.getQ().startsWith(prefix);
    }

    public static RequestMatcher queryContains(String part) {
        return parameters -> parameters.getQ() != null && parameters.getQ().contains(part);
    }

    public static RequestMatcher queryEqualsIgnoreCase(String query) {
        return parameters -> query.equalsIgnoreCase(parameters.getQ());
    }

    public static RequestMatcher noQuery() {
        return parameters -> parameters.getQ() == null;
    }

    public static RequestMatcher apikey(String apikey) {
        return parameters -> apikey.equals(parameters.getApikey());
    }

    public static RequestMatcher apikeyContains(String part) {
        return parameters -> parameters.getApikey() != null && parameters.getApikey().contains(part);
    }

    public static RequestMatcher tmdbId(String tmdbId) {
        return parameters -> tmdbId.equals(parameters.getTmdbid());
    }

    public static RequestMatcher imdbId(String imdbId) {
        return parameters -> imdbId.equals(parameters.getImdbid());
    }

    public static RequestMatcher tvdbId(String tvdbId) {
        return parameters -> tvdbId.equals(parameters.getTvdbid());
    }

    public static RequestMatcher hasTmdbId() {
        return parameters -> parameters.getTmdbid() != null;
    }

    public static RequestMatcher hasImdbId() {
        return parameters -> parameters.getImdbid() != null;
    }

    public static RequestMatcher hasRid() {
        return parameters -> parameters.getRid() != null;
    }

    public static RequestMatcher action(ActionAttribute action) {
        return parameters -> parameters.getT() == action;
    }

    public static RequestMatcher all(RequestMatcher... matchers) {
        return parameters -> Arrays.stream(matchers).allMatch(matcher -> matcher.matches(parameters));
    }

    public static RequestMatcher any(RequestMatcher... matchers) {
        return parameters -> Arrays.stream(matchers).anyMatch(matcher -> matcher.matches(parameters));
    }

    public static RequestMatcher not(RequestMatcher matcher) {
        return parameters -> !matcher.matches(parameters);
    }

    public static RequestMatcher always() {
        return parameters -> true;
    }

    /**
     * Matches while the given system property is <em>not</em> set, used to let the system tests disable the dognzb mock.
     */
    public static RequestMatcher systemPropertyAbsent(String name) {
        return parameters -> System.getProperty(name) == null;
    }

}
