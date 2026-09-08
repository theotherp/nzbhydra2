package org.nzbhydra.mockserver.newznab;

import java.time.Duration;
import java.util.List;

/**
 * Broken and slow answers.
 *
 * <p>The sleep scenarios are delays only: in the original chain they slept and then fell through into the branches
 * below them, so a "sleep10" request sleeps twice (a random time plus ten seconds) and is then answered by the persona
 * default. The registry reproduces that by continuing to look for an answering scenario after a delay.</p>
 */
public final class FailureScenarios {

    public static final String INVALID_XML_RESOURCE = "org/nzbhydra/mockserver/invalidXml.xml";
    public static final String INVALID_XML_QUERY = "invalidxml";
    public static final String ERROR_QUERY = "error";
    public static final String SLEEP_QUERY_PREFIX = "sleep";

    private FailureScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(invalidXml(), error(), sleepRandom(), sleepTenSeconds(), sleepTwentySeconds(), sleepLongForIndexerOne(), sleepLong());
    }

    public static Scenario invalidXml() {
        return new Scenario("failure-invalid-xml",
                "Returns unparsable XML with HTTP 200",
                Match.query(INVALID_XML_QUERY),
                Respond.rawXmlResource(INVALID_XML_RESOURCE));
    }

    public static Scenario error() {
        return new Scenario("failure-error",
                "Returns a newznab error with HTTP 200",
                Match.query(ERROR_QUERY),
                Respond.error("123", "description"));
    }

    public static Scenario sleepRandom() {
        return new Scenario("failure-sleep",
                "Any \"sleep*\" query sleeps up to five seconds before being answered",
                Match.queryStartsWith(SLEEP_QUERY_PREFIX),
                Respond.delay(context -> Duration.ofMillis(context.random().nextInt(5000))));
    }

    public static Scenario sleepTenSeconds() {
        return new Scenario("failure-sleep10",
                "\"sleep10*\" sleeps another ten seconds",
                Match.queryStartsWith("sleep10"),
                Respond.delay(Duration.ofSeconds(10)));
    }

    public static Scenario sleepTwentySeconds() {
        return new Scenario("failure-sleep20",
                "\"sleep20*\" sleeps another twenty seconds",
                Match.queryStartsWith("sleep20"),
                Respond.delay(Duration.ofSeconds(20)));
    }

    public static Scenario sleepLongForIndexerOne() {
        return new Scenario("failure-sleeplong1",
                "\"sleeplong1\" sleeps effectively forever, but only for the indexer with the API key 1",
                Match.all(Match.query("sleeplong1"), Match.apikey("1")),
                Respond.delay(Duration.ofMillis(10000L * 10000)));
    }

    public static Scenario sleepLong() {
        return new Scenario("failure-sleeplong",
                "\"sleeplong\" sleeps ten minutes",
                Match.query("sleeplong"),
                Respond.delay(Duration.ofMillis(10000L * 60)));
    }

}
