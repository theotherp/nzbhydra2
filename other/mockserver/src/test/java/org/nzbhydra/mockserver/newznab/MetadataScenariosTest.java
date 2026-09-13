package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlError;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class MetadataScenariosTest {

    @Test
    void shouldReturnNoResultsForARidSearchWithoutQuery() throws Exception {
        NewznabParameters parameters = params("1", null);
        parameters.setRid("12345");

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-rid-without-query");
        assertThat(answer.items()).isEmpty();
        assertThat(answer.total()).isZero();
    }

    @Test
    void shouldReturnResultsForARidSearchWithQuery() throws Exception {
        NewznabParameters parameters = params("1", "anything");
        parameters.setRid("12345");

        assertThat(answer(parameters).scenarioId()).isEqualTo("persona-default");
    }

    @Test
    void shouldReturnNoResultsForTheEmptyImdbId() throws Exception {
        NewznabParameters parameters = params("1", null);
        parameters.setImdbid(MetadataScenarios.EMPTY_IMDB_ID);

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-imdb-empty");
        assertThat(answer.items()).isEmpty();
    }

    @Test
    void shouldClaimTenThousandResultsForTheDedicatedTmdbId() throws Exception {
        NewznabParameters parameters = params("1", null);
        parameters.setTmdbid(MetadataScenarios.MANY_RESULTS_TMDB_ID);

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-tmdb-many-results");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(10_000);
    }

    @Test
    void shouldReturnEpisodesForATvSearchWithImdbId() throws Exception {
        NewznabParameters parameters = params("1", null);
        parameters.setT(ActionAttribute.TVSEARCH);
        parameters.setImdbid("tt1234567");

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-tvsearch-imdb");
        assertThat(answer.items()).hasSize(15);
        assertThat(answer.total()).isEqualTo(15);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexergame of thrones-1");
        assertThat(attribute(answer.items().get(4).getNewznabAttributes(), "season")).isEqualTo("1");
        assertThat(attribute(answer.items().get(4).getNewznabAttributes(), "episode")).isEqualTo("1");
        assertThat(attribute(answer.items().get(0).getNewznabAttributes(), "category")).isEqualTo("5040");
    }

    @Test
    void shouldReturnAnErrorForTheErrorApiKeys() throws Exception {
        NewznabParameters parameters = params(MetadataScenarios.ERROR_APIKEY, null);
        parameters.setTmdbid("1234");

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-tmdb-error");
        assertThat(answer.body()).isInstanceOf(NewznabXmlError.class);
        assertThat(((NewznabXmlError) answer.body()).getCode()).isEqualTo("123");

        NewznabParameters capsCheckError = params(MetadataScenarios.CAPS_CHECK_ERROR_APIKEY, null);
        capsCheckError.setTmdbid("1234");
        assertThat(answer(capsCheckError).scenarioId()).isEqualTo("metadata-tmdb-error");
    }

    @Test
    void shouldReturnAvengersForAnyOtherTmdbSearch() throws Exception {
        NewznabParameters parameters = params("1", null);
        parameters.setTmdbid("1234");

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-tmdb-generic");
        assertThat(answer.items()).hasSize(10);
        assertThat(answer.items().get(0).getTitle()).startsWith("indexeravengers-");
        assertThat(answer.apiLimits()).isNull();
    }

    @Test
    void shouldReportApiLimitsForIndexersThatDo() throws Exception {
        NewznabParameters parameters = params("limits1", null);
        parameters.setTmdbid("1234");

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.apiLimits()).isNotNull();
        assertThat(answer.apiLimits().getApiMax()).isEqualTo(IndexerPersona.API_MAX);
        assertThat(answer.apiLimits().getGrabMax()).isNull();
    }

    @Test
    void shouldReturnTenResultsForAnImdbSearch() throws Exception {
        NewznabParameters parameters = params("limits1", null);
        parameters.setImdbid("tt1234567");

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("metadata-imdb-generic");
        assertThat(answer.items()).hasSize(10);
        assertThat(answer.total()).isEqualTo(10);
        assertThat(answer.apiLimits().getGrabMax()).isEqualTo(200);
    }

    @Test
    void shouldNotFailWithoutApiKey() throws Exception {
        NewznabParameters parameters = params(null, null);
        parameters.setTmdbid("1234");

        assertThat(answer(parameters).scenarioId()).isEqualTo("metadata-tmdb-generic");
    }

    private String attribute(List<NewznabAttribute> attributes, String name) {
        return attributes.stream().filter(attribute -> attribute.getName().equals(name)).map(NewznabAttribute::getValue).findFirst().orElse(null);
    }

}
