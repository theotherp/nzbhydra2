package org.nzbhydra.mockserver;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MockTmdbTest {

    private final MockTmdb testee = new MockTmdb();

    @Test
    void shouldReturnRealisticDeterministicMovieSearchResponse() {
        Map<String, Object> response = testee.searchMovies(MockTmdb.DETERMINISTIC_MOVIE_QUERY, MockTmdb.SYSTEM_TEST_API_KEY);

        assertThat(response.get("page")).isEqualTo(1);
        assertThat(response.get("total_pages")).isEqualTo(1);
        assertThat(response.get("total_results")).isEqualTo(1);

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).get("id")).isEqualTo(424242);
        assertThat(results.get(0).get("title")).isEqualTo(MockTmdb.DETERMINISTIC_MOVIE_QUERY);
        assertThat(results.get(0).get("release_date")).isEqualTo("2000-01-01");
    }

    @Test
    void shouldRejectUnexpectedApiKey() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> testee.searchMovies(MockTmdb.DETERMINISTIC_MOVIE_QUERY, "wrong"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid TMDB system-test API key");
    }
}
