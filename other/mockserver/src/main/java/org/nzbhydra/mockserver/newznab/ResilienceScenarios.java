package org.nzbhydra.mockserver.newznab;

import java.time.Duration;
import java.util.List;

/**
 * The failure modes used by the indexer failure resilience system test. Both only apply to the one indexer that test
 * breaks, identified by its API key.
 */
public final class ResilienceScenarios {

    public static final String FAILURE_INDEXER_APIKEY = "resilience-failure-indexer";
    public static final String TIMEOUT_QUERY_PREFIX = "resilience-timeout";
    public static final String MALFORMED_XML_QUERY_PREFIX = "resilience-malformed-xml";
    public static final Duration TIMEOUT_DELAY = Duration.ofSeconds(2);

    private ResilienceScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(timeout(), malformedXml());
    }

    /**
     * Delays only, the request is then answered by whatever scenario matches it (usually the persona default), exactly
     * like the original chain did.
     */
    public static Scenario timeout() {
        return new Scenario("resilience-timeout",
                "Failure indexer sleeps two seconds so that the configured timeout hits",
                Match.all(Match.queryStartsWith(TIMEOUT_QUERY_PREFIX), Match.apikey(FAILURE_INDEXER_APIKEY)),
                Respond.delay(TIMEOUT_DELAY));
    }

    public static Scenario malformedXml() {
        return new Scenario("resilience-malformed-xml",
                "Failure indexer returns unparsable XML with HTTP 200",
                Match.all(Match.queryStartsWith(MALFORMED_XML_QUERY_PREFIX), Match.apikey(FAILURE_INDEXER_APIKEY)),
                Respond.rawXmlResource(FailureScenarios.INVALID_XML_RESOURCE));
    }

}
