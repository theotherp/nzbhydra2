package org.nzbhydra.mediainfo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.*;

public class InfoProviderTest {

    @Mock
    TmdbHandler tmdbHandlerMock;
    @Mock
    TvMazeHandler tvMazeHandlerMock;
    @Mock
    private TvInfoRepository tvInfoRepositoryMock;
    @Mock
    private MovieInfoRepository movieInfoRepository;

    @InjectMocks
    private InfoProvider testee = new InfoProvider();

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);

        when(tvMazeHandlerMock.getInfos(anyString(), any(MediaIdType.class))).thenReturn(new TvMazeSearchResult("tvmazeId", "tvrageId", "tvdbId", "imdbid", "title", 0, "posterUrl"));
        when(tvMazeHandlerMock.search(anyString())).thenReturn(Collections.singletonList(new TvMazeSearchResult("tvmazeId", "tvrageId", "tvdbId", "Imdbid", "title", 0, "posterUrl")));
        when(tmdbHandlerMock.getInfos(anyString(), any(MediaIdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
        when(tmdbHandlerMock.search(anyString(), anyInt())).thenReturn(Collections.singletonList(new TmdbSearchResult(null, null, null, null, null)));

        when(tvInfoRepositoryMock.findByTitle(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByTvdbId(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByTvmazeId(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByImdbId(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByTvrageId(anyString())).thenReturn(null);

        when(movieInfoRepository.findByTitle(anyString())).thenReturn(null);
        when(movieInfoRepository.findByImdbId(anyString())).thenReturn(null);
        when(movieInfoRepository.findByTmdbId(anyString())).thenReturn(null);
    }

    @Test
    void canConvert() throws Exception {
        for (MediaIdType type : Arrays.asList(MediaIdType.IMDB, MediaIdType.TMDB, MediaIdType.MOVIETITLE)) {
            for (MediaIdType type2 : Arrays.asList(MediaIdType.IMDB, MediaIdType.TMDB, MediaIdType.MOVIETITLE)) {
                assertTrue(testee.canConvert(type, type2));
            }
        }

        for (MediaIdType type : Arrays.asList(MediaIdType.TVMAZE, MediaIdType.TVDB, MediaIdType.TVRAGE, MediaIdType.TVTITLE, MediaIdType.TVIMDB)) {
            for (MediaIdType type2 : Arrays.asList(MediaIdType.TVMAZE, MediaIdType.TVDB, MediaIdType.TVRAGE, MediaIdType.TVTITLE, MediaIdType.TVIMDB)) {
                assertTrue(testee.canConvert(type, type2), "Should be able to convert " + type + " to " + type2);
            }
        }
    }

    @Test
    void canConvertAny() throws Exception {
        assertTrue(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet(MediaIdType.TVRAGE)));
        assertTrue(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet(MediaIdType.TVMAZE)));
        assertTrue(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE), Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB)));

        assertThat(testee.canConvertAny(Sets.newSet(), Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB))).isFalse();
        assertThat(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet())).isFalse();

        assertThat(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet(MediaIdType.TMDB))).isFalse();
    }

    @Test
    void shouldCatchUnexpectedError() throws Exception {
        when(tvMazeHandlerMock.getInfos(anyString(), eq(MediaIdType.TVDB))).thenThrow(IllegalArgumentException.class);
        try {
            testee.convert("", MediaIdType.TVDB);
            fail("Should've failed");
        } catch (Exception e) {
            assertThat(e.getClass()).isEqualTo(InfoProviderException.class);
        }
    }

    @Test
    void shouldCallTvMaze() throws Exception {
        ArgumentCaptor<TvInfo> tvInfoArgumentCaptor = ArgumentCaptor.forClass(TvInfo.class);
        for (MediaIdType type : Arrays.asList(MediaIdType.TVMAZE, MediaIdType.TVDB, MediaIdType.TVRAGE, MediaIdType.TVTITLE, MediaIdType.TVIMDB)) {
            reset(tvMazeHandlerMock);
            when(tvMazeHandlerMock.getInfos(anyString(), any(MediaIdType.class))).thenReturn(new TvMazeSearchResult("tvmazeId", "tvrageId", "tvdbId", "imdbId", "title", 0, "posterUrl"));
            testee.convert("value", type);
            verify(tvMazeHandlerMock).getInfos("value", type);
        }

        verify(tvInfoRepositoryMock).findByTvdbId("value");
        verify(tvInfoRepositoryMock).findByTvrageId("value");
        verify(tvInfoRepositoryMock).findByTvmazeId("value");
        verify(tvInfoRepositoryMock).findByImdbId("ttvalue");
        verify(tvInfoRepositoryMock, times(5)).save(tvInfoArgumentCaptor.capture());
        assertThat(tvInfoArgumentCaptor.getAllValues()).hasSize(5);
        assertThat(tvInfoArgumentCaptor.getValue().getTitle()).isEqualTo("title");
        assertThat(tvInfoArgumentCaptor.getValue().getTvdbId().get()).isEqualTo("tvdbId");
        assertThat(tvInfoArgumentCaptor.getValue().getTvmazeId().get()).isEqualTo("tvmazeId");
        assertThat(tvInfoArgumentCaptor.getValue().getTvrageId().get()).isEqualTo("tvrageId");
        assertThat(tvInfoArgumentCaptor.getValue().getImdbId().get()).isEqualTo("ttimdbId");
        assertThat(tvInfoArgumentCaptor.getValue().getYear()).isEqualTo(Integer.valueOf(0));
    }

    @Test
    void shouldCallTmdb() throws Exception {
        for (MediaIdType type : Arrays.asList(MediaIdType.IMDB, MediaIdType.TMDB, MediaIdType.MOVIETITLE)) {
            testConvertByType(type, type == MediaIdType.IMDB ? "ttvalue" : "value");
        }
        verify(movieInfoRepository).findByTmdbId("value");
        verify(movieInfoRepository).findByImdbId("ttvalue");
    }

    protected void testConvertByType(MediaIdType type, String expectedValue) throws InfoProviderException {
        reset(tmdbHandlerMock);
        when(tmdbHandlerMock.getInfos(anyString(), any(MediaIdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
        testee.convert("value", type);
        verify(tmdbHandlerMock).getInfos(expectedValue, type);
    }

    @Test
    void shouldSearch() throws Exception {
        testee.search("title", MediaIdType.TVTITLE);
        verify(tvMazeHandlerMock).search("title");

        testee.search("title", MediaIdType.MOVIETITLE);
        verify(tmdbHandlerMock).search("title", null);
    }

    @Test
    void shouldGetInfoWithMostIds() {
        TvInfo mostInfo = new TvInfo("abc", "abc", "abc", null, null, null, null);
        when(tvInfoRepositoryMock.findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(anyString(), anyString(), anyString(), anyString())).thenReturn(Arrays.asList(
            mostInfo,
            new TvInfo("abc", "abc", null, null, null, null, null),
            new TvInfo("abc", null, null, null, null, null, null)
        ));

        TvInfo info = testee.findTvInfoInDatabase(new HashMap<>());
        assertThat(info).isEqualTo(mostInfo);
    }

}
