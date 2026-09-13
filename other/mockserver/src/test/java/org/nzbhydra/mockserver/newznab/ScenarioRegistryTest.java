package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.NewznabParameters;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.NEWZNAB;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.TORZNAB;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class ScenarioRegistryTest {

    @Test
    void shouldResolveTheDeterministicFixturesBeforeAnythingElse() throws Exception {
        assertThat(NEWZNAB.all().stream().map(Scenario::id).toList().indexOf("deterministic-movie-tmdb"))
                .isLessThan(NEWZNAB.all().stream().map(Scenario::id).toList().indexOf("metadata-tmdb-generic"));

        NewznabParameters movie = params("1", "some movies");
        movie.setTmdbid(DeterministicFixtures.DETERMINISTIC_MOVIE_TMDB_ID);
        assertThat(answer(movie).scenarioId()).isEqualTo("deterministic-movie-tmdb");

        assertThat(TORZNAB.all().get(0).id()).isEqualTo("torznab-deterministic-file");
        assertThat(TORZNAB.all().get(1).id()).isEqualTo("torznab-deterministic-magnet");
    }

    @Test
    void shouldKeepThePrecedenceOfTheOriginalChain() throws Exception {
        List<String> ids = NEWZNAB.all().stream().map(Scenario::id).toList();

        assertThat(ids.indexOf("content-movies")).isLessThan(ids.indexOf("duplicates-oneduplicate"));
        assertThat(ids.indexOf("content-movies")).isLessThan(ids.indexOf("metadata-tmdb-generic"));
        assertThat(ids.indexOf("content-noresults")).isLessThan(ids.indexOf("failure-sleep"));
        assertThat(ids.indexOf("metadata-tmdb-error")).isLessThan(ids.indexOf("metadata-tmdb-generic"));

        //A TMDB search with a movie query is answered by the movies scenario, like before
        NewznabParameters parameters = params("1", "some movies");
        parameters.setTmdbid("1234");
        assertThat(answer(parameters).scenarioId()).isEqualTo("content-movies");
    }

    @Test
    void shouldFallBackToThePersonaDefault() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", "some arbitrary query");

        assertThat(answer.scenarioId()).isEqualTo("persona-default");
        assertThat(answer.items()).hasSize(20);
        assertThat(answer.total()).isEqualTo(20);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexer1-1");
    }

    @Test
    void shouldClampThePersonaResultsByOffsetAndLimit() throws Exception {
        NewznabParameters parameters = params("2", "some arbitrary query");
        parameters.setOffset(0);
        parameters.setLimit(50);

        assertThat(answer(parameters).items()).hasSize(50);
    }

    @Test
    void shouldReturnNoResultsForUnknownNumericApiKeys() throws Exception {
        assertThat(answer("42", "some arbitrary query").items()).isEmpty();
    }

    @Test
    void shouldNeverFailWithoutApiKeyOrQuery() throws Exception {
        ScenarioTestSupport.Answer answer = answer(params(null, null));

        assertThat(answer.scenarioId()).isEqualTo("persona-default");
        assertThat(answer.items()).hasSize(10);
    }

    @Test
    void shouldHaveUniqueScenarioIds() {
        List<String> ids = List.of(NEWZNAB, TORZNAB).stream().flatMap(registry -> registry.all().stream()).map(Scenario::id).toList();

        assertThat(ids).doesNotHaveDuplicates();
    }

    @Test
    void shouldOnlyEndWithCatchAllScenarios() {
        assertThat(NEWZNAB.all().get(NEWZNAB.all().size() - 1).id()).isEqualTo("persona-default");
        assertThat(TORZNAB.all().get(TORZNAB.all().size() - 1).id()).isEqualTo("torznab-default");
    }

}
