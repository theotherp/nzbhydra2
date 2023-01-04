package org.nzbhydra.mediainfo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.mediainfo.MediaIdType;

import static org.assertj.core.api.Assertions.assertThat;

@Disabled //Needs internet access
public class TmdbHandlerTest {

    TmdbHandler testee = new TmdbHandler();

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.tmdb = new CustomTmdb("4df99d58875c2d01fc04936759fea56f");
    }

    @Test
    void imdbToTmdb() throws Exception {
        TmdbSearchResult result = testee.getInfos("tt5895028", MediaIdType.IMDB);
        assertThat(result.getTmdbId()).isEqualTo("407806");
        assertThat(result.getTitle()).isEqualTo("13th");
    }

    @Test
    void tmdbToImdb() throws Exception {
        TmdbSearchResult result = testee.getInfos("407806", MediaIdType.TMDB);
        assertThat(result.getImdbId()).isEqualTo("tt5895028");
        assertThat(result.getTitle()).isEqualTo("13th");
    }

    @Test
    void fromTitle() throws Exception {
        TmdbSearchResult result = testee.getInfos("gladiator", MediaIdType.MOVIETITLE);
        assertThat(result.getImdbId()).isEqualTo("tt0172495");

        result = testee.fromTitle("gladiator", 1992);
        assertThat(result.getImdbId()).isEqualTo("tt0104346");
    }

}
