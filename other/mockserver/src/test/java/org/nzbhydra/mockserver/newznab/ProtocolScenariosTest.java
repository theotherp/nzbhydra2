package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;

class ProtocolScenariosTest {

    @Test
    void shouldAnswerWithTooManyRequestsForTheDedicatedApiKey() throws Exception {
        ScenarioTestSupport.Answer answer = answer("429", "anything");

        assertThat(answer.scenarioId()).isEqualTo("protocol-too-many-requests");
        assertThat(answer.status()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(answer.body()).isNull();
    }

    @Test
    void shouldAnswerWithForbiddenForTheDedicatedQuery() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", "403");

        assertThat(answer.scenarioId()).isEqualTo("protocol-forbidden");
        assertThat(answer.status()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(answer.body()).isEqualTo("error body");
    }

    @Test
    void shouldPreferTheTooManyRequestsApiKeyOverEverythingElse() throws Exception {
        assertThat(answer("429", "403").scenarioId()).isEqualTo("protocol-too-many-requests");
    }

}
