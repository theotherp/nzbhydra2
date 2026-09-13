package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;
import org.springframework.http.HttpStatus;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;

class FailureScenariosTest {

    @Test
    void shouldReturnInvalidXml() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", FailureScenarios.INVALID_XML_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("failure-invalid-xml");
        assertThat(answer.status()).isEqualTo(HttpStatus.OK);
        assertThat(answer.body()).asString().contains("<rss version=\"2.0\"");
    }

    @Test
    void shouldReturnANewznabError() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", FailureScenarios.ERROR_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("failure-error");
        assertThat(answer.status()).isEqualTo(HttpStatus.OK);
        assertThat(((NewznabXmlError) answer.body()).getDescription()).isEqualTo("description");
    }

    @Test
    void shouldSleepAndThenAnswerWithTheDefaultResults() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", "sleep");

        assertThat(answer.sleeps()).hasSize(1);
        assertThat(answer.sleeps().get(0)).isLessThan(Duration.ofSeconds(5));
        assertThat(answer.scenarioId()).isEqualTo("persona-default");
        assertThat(answer.items()).hasSize(20);
    }

    @Test
    void shouldAddUpTheSleepsOfTheOverlappingSleepQueries() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", "sleep10");

        assertThat(answer.sleeps()).hasSize(2);
        assertThat(answer.sleeps().get(1)).isEqualTo(Duration.ofSeconds(10));
        assertThat(answer.scenarioId()).isEqualTo("persona-default");

        assertThat(answer("1", "sleep20").sleeps()).hasSize(2).element(1).isEqualTo(Duration.ofSeconds(20));
    }

    @Test
    void shouldSleepEffectivelyForeverForTheDedicatedIndexer() throws Exception {
        assertThat(answer("1", "sleeplong1").sleeps()).contains(Duration.ofMillis(10000L * 10000));
        assertThat(answer("2", "sleeplong1").sleeps()).doesNotContain(Duration.ofMillis(10000L * 10000));
        assertThat(answer("2", "sleeplong").sleeps()).contains(Duration.ofMinutes(10));
    }

}
