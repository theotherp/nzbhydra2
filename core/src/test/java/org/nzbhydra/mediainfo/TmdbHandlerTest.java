package org.nzbhydra.mediainfo;

import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.mockito.MockitoAnnotations;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

@Ignore //Needs internet access
public class TmdbHandlerTest {

    TmdbHandler testee = new TmdbHandler();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.tmdb = new CustomTmdb("4df99d58875c2d01fc04936759fea56f");
    }

    @Test
    public void imdbToTmdb() throws Exception {
        TmdbSearchResult result = testee.getInfos("tt5895028", MediaIdType.IMDB);
        assertThat(result.getTmdbId(), is("407806"));
        assertThat(result.getTitle(), is("13th"));
    }

    @Test
    public void tmdbToImdb() throws Exception {
        TmdbSearchResult result = testee.getInfos("407806", MediaIdType.TMDB);
        assertThat(result.getImdbId(), is("tt5895028"));
        assertThat(result.getTitle(), is("13th"));
    }

    @Test
    public void fromTitle() throws Exception {
        TmdbSearchResult result = testee.getInfos("gladiator", MediaIdType.MOVIETITLE);
        assertThat(result.getImdbId(), is("tt0172495"));

        result = testee.fromTitle("gladiator", 1992);
        assertThat(result.getImdbId(), is("tt0104346"));
    }

}