package org.nzbhydra.mockserver;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
public class MockTmdb {

    private static final Logger logger = LoggerFactory.getLogger(MockTmdb.class);

    public static final String DETERMINISTIC_MOVIE_QUERY = "Hydra Browser Movie";
    public static final int DETERMINISTIC_MOVIE_YEAR = 2000;

    @GetMapping(value = "/3/search/movie", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> searchMovies(@RequestParam String query) {
        List<Map<String, Object>> results = DETERMINISTIC_MOVIE_QUERY.equals(query)
                ? List.of(Map.of(
                "id", Integer.parseInt(MockNewznab.DETERMINISTIC_MOVIE_TMDB_ID),
                "title", DETERMINISTIC_MOVIE_QUERY,
                "release_date", DETERMINISTIC_MOVIE_YEAR + "-01-01"))
                : Collections.emptyList();
        Map<String, Object> result = Map.of("page", 1, "results", results, "total_pages", 1, "total_results", results.size());
        logger.info("Returning {}", result);
        return result;
    }
}
