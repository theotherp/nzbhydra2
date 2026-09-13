package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.NewznabParameters;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class DeterministicFixturesTest {

    @Test
    void shouldReturnTheDownloaderIntegrationNzb() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DeterministicFixtures.DETERMINISTIC_DOWNLOADER_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("deterministic-downloader-nzb");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.items().get(0).getTitle()).isEqualTo(DeterministicFixtures.DETERMINISTIC_DOWNLOADER_TITLE);
        assertThat(answer.items().get(0).getPubDate()).isEqualTo(Instant.EPOCH);
        assertThat(answer.items().get(0).getLink()).isEqualTo("http://127.0.0.1:5080/nzb/downloader-integration-1");
        assertThat(answer.total()).isEqualTo(1);
    }

    @Test
    void shouldReturnTheNzbGetIntegrationNzbForEveryMarkerQuery() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DeterministicFixtures.DETERMINISTIC_NZBGET_QUERY_PREFIX + "42");

        assertThat(answer.scenarioId()).isEqualTo("deterministic-nzbget-nzb");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.items().get(0).getTitle()).isEqualTo(DeterministicFixtures.DETERMINISTIC_NZBGET_TITLE);
        assertThat(answer.items().get(0).getLink()).isEqualTo("http://127.0.0.1:5080/nzb/nzbget-integration-1");
    }

    @Test
    void shouldReturnTheDeterministicMovieForItsTmdbId() throws Exception {
        NewznabParameters parameters = params("1", null);
        parameters.setTmdbid(DeterministicFixtures.DETERMINISTIC_MOVIE_TMDB_ID);

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("deterministic-movie-tmdb");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.items().get(0).getTitle()).isEqualTo(DeterministicFixtures.DETERMINISTIC_MOVIE_TITLE);
        assertThat(answer.total()).isEqualTo(1);
    }

    @Test
    void shouldReturnTheDeterministicTorrentFileFromTheTorznabRegistry() throws Exception {
        ScenarioTestSupport.Answer answer = ScenarioTestSupport.answer(ScenarioTestSupport.TORZNAB, params("1", DeterministicFixtures.DETERMINISTIC_TORRENT_FILE_QUERY));

        assertThat(answer.scenarioId()).isEqualTo("torznab-deterministic-file");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.items().get(0).getTitle()).isEqualTo(DeterministicFixtures.DETERMINISTIC_TORRENT_TITLE);
        assertThat(answer.items().get(0).getLink()).isEqualTo("http://127.0.0.1:5080/torrent/deterministic-file");
        assertThat(answer.root().getRssChannel().getNewznabResponse()).isNull();
    }

    @Test
    void shouldReturnTheDeterministicMagnetFromTheTorznabRegistry() throws Exception {
        ScenarioTestSupport.Answer answer = ScenarioTestSupport.answer(ScenarioTestSupport.TORZNAB, params("1", DeterministicFixtures.DETERMINISTIC_MAGNET_QUERY));

        assertThat(answer.scenarioId()).isEqualTo("torznab-deterministic-magnet");
        assertThat(answer.items().get(0).getLink()).isEqualTo(DeterministicFixtures.DETERMINISTIC_MAGNET_URI);
        assertThat(answer.items().get(0).getComments()).isEqualTo("http://127.0.0.1:5080/details/deterministic-magnet-guid");
    }

}
