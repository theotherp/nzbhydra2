package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;

class ResilienceScenariosTest {

    private static final String FAILURE_APIKEY = ResilienceScenarios.FAILURE_INDEXER_APIKEY;

    @Test
    void shouldDelayAndThenStillAnswerTheTimeoutQuery() throws Exception {
        ScenarioTestSupport.Answer answer = answer(FAILURE_APIKEY, "resilience-timeout-results");

        assertThat(answer.sleeps()).containsExactly(Duration.ofSeconds(2));
        assertThat(answer.scenarioId()).isEqualTo("persona-default");
        assertThat(answer.status()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDelayTheStatusQueriesOfTheResilienceTestAsWell() throws Exception {
        assertThat(answer(FAILURE_APIKEY, "resilience-timeout-status-1").sleeps()).containsExactly(Duration.ofSeconds(2));
    }

    @Test
    void shouldNotDelayForAnyOtherIndexer() throws Exception {
        assertThat(answer("1", "resilience-timeout-results").sleeps()).isEmpty();
    }

    @Test
    void shouldReturnMalformedXmlForTheFailureIndexer() throws Exception {
        ScenarioTestSupport.Answer answer = answer(FAILURE_APIKEY, "resilience-malformed-xml-results");

        assertThat(answer.scenarioId()).isEqualTo("resilience-malformed-xml");
        assertThat(answer.status()).isEqualTo(HttpStatus.OK);
        assertThat(answer.body()).asString().startsWith("<?xml version=\"1.0\"");
        assertThat(answer.sleeps()).isEmpty();
    }

    @Test
    void shouldReturnRegularResultsForMalformedXmlQueriesOfOtherIndexers() throws Exception {
        assertThat(answer("1", "resilience-malformed-xml-results").scenarioId()).isEqualTo("persona-default");
    }

}
