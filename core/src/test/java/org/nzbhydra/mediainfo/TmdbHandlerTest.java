package org.nzbhydra.mediainfo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.webaccess.WebAccess;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TmdbHandlerTest {

    @Mock
    private WebAccess webAccess;

    @InjectMocks
    private TmdbHandler testee;

    @BeforeEach
    void setUp() {
        testee.tmdbApiBaseUrl = "http://mockserver:5080/3";
        testee.tmdbApiKey = "test-api-key";
    }

    @Test
    void shouldUseConfiguredBaseUrlAndMapMovieSearchResults() throws Exception {
        when(webAccess.callUrl("http://mockserver:5080/3/search/movie?query=Hydra Browser Movie&year=null&api_key=test-api-key"))
                .thenReturn("""
                        {"results":[{"id":424242,"title":"Hydra Browser Movie","release_date":"2000-01-01"}]}
                        """);

        List<TmdbSearchResult> results = testee.search("Hydra Browser Movie", null);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.getTmdbId()).isEqualTo("424242");
            assertThat(result.getTitle()).isEqualTo("Hydra Browser Movie");
            assertThat(result.getYear()).isEqualTo(2000);
        });
    }
}
