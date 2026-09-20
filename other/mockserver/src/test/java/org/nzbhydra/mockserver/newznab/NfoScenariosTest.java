package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;

class NfoScenariosTest {

    private static NewznabParameters getNfoParams(String apikey, String id) {
        NewznabParameters params = new NewznabParameters();
        params.setApikey(apikey);
        params.setT(ActionAttribute.GETNFO);
        params.setId(id);
        return params;
    }

    @Test
    void shouldAnswerGetnfoWithTheLegacyDescriptionByDefault() throws Exception {
        ScenarioTestSupport.Answer answer = answer(getNfoParams("1", "the-id"));

        assertThat(answer.scenarioId()).isEqualTo("nfo-default");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.items().get(0).getDescription()).startsWith("NFO for NZB with ID the-id");
        assertThat(answer.total()).isEqualTo(1);
    }

    @Test
    void shouldAnswerGetnfoWithAsciiArtForTheMarkedApiKey() throws Exception {
        ScenarioTestSupport.Answer answer = answer(getNfoParams("indexer-" + NfoScenarios.ASCII_ART_APIKEY_MARKER, "the-id"));

        assertThat(answer.scenarioId()).isEqualTo("nfo-ascii-art");
        String description = answer.items().get(0).getDescription();
        assertThat(description).contains("&#9608;");
        assertThat(description).doesNotContain("█");
        assertThat(answer.total()).isEqualTo(1);
    }

    @Test
    void shouldPreferTheTooManyRequestsApiKeyOverGetnfo() throws Exception {
        ScenarioTestSupport.Answer answer = answer(getNfoParams("429", "the-id"));

        assertThat(answer.scenarioId()).isEqualTo("protocol-too-many-requests");
    }

}
