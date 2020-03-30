package org.nzbhydra.mediainfo;

import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.*;
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

    @Before
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
    public void canConvert() throws Exception {
        for (MediaIdType type : Arrays.asList(MediaIdType.IMDB, MediaIdType.TMDB, MediaIdType.MOVIETITLE)) {
            for (MediaIdType type2 : Arrays.asList(MediaIdType.IMDB, MediaIdType.TMDB, MediaIdType.MOVIETITLE)) {
                assertTrue(testee.canConvert(type, type2));
            }
        }

        for (MediaIdType type : Arrays.asList(MediaIdType.TVMAZE, MediaIdType.TVDB, MediaIdType.TVRAGE, MediaIdType.TVTITLE, MediaIdType.TVIMDB)) {
            for (MediaIdType type2 : Arrays.asList(MediaIdType.TVMAZE, MediaIdType.TVDB, MediaIdType.TVRAGE, MediaIdType.TVTITLE, MediaIdType.TVIMDB)) {
                assertTrue("Should be able to convert " + type + " to " + type2, testee.canConvert(type, type2));
            }
        }
    }

    @Test
    public void canConvertAny() throws Exception {
        assertTrue(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet(MediaIdType.TVRAGE)));
        assertTrue(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet(MediaIdType.TVMAZE)));
        assertTrue(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE), Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB)));

        assertFalse(testee.canConvertAny(Sets.newSet(), Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB)));
        assertFalse(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet()));

        assertFalse(testee.canConvertAny(Sets.newSet(MediaIdType.TVMAZE, MediaIdType.TVDB), Sets.newSet(MediaIdType.TMDB)));
    }

    @Test
    public void shouldCatchUnexpectedError() throws Exception {
        when(tvMazeHandlerMock.getInfos(anyString(), eq(MediaIdType.TVDB))).thenThrow(IllegalArgumentException.class);
        try {
            testee.convert("", MediaIdType.TVDB);
            fail("Should've failed");
        } catch (Exception e) {
            assertEquals(InfoProviderException.class, e.getClass());
        }
    }

    @Test
    public void shouldCallTvMaze() throws Exception {
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
        assertEquals(5, tvInfoArgumentCaptor.getAllValues().size());
        assertEquals("title", tvInfoArgumentCaptor.getValue().getTitle());
        assertEquals("tvdbId", tvInfoArgumentCaptor.getValue().getTvdbId().get());
        assertEquals("tvmazeId", tvInfoArgumentCaptor.getValue().getTvmazeId().get());
        assertEquals("tvrageId", tvInfoArgumentCaptor.getValue().getTvrageId().get());
        assertEquals("ttimdbId", tvInfoArgumentCaptor.getValue().getImdbId().get());
        assertEquals(Integer.valueOf(0), tvInfoArgumentCaptor.getValue().getYear());
    }

    @Test
    public void shouldCallTmdb() throws Exception {
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
    public void shouldSearch() throws Exception {
        testee.search("title", MediaIdType.TVTITLE);
        verify(tvMazeHandlerMock).search("title");

        testee.search("title", MediaIdType.MOVIETITLE);
        verify(tmdbHandlerMock).search("title", null);
    }

    @Test
    public void shouldGetInfoWithMostIds() {
        TvInfo mostInfo = new TvInfo("abc", "abc", "abc", null, null, null, null);
        when(tvInfoRepositoryMock.findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(anyString(), anyString(), anyString(), anyString())).thenReturn(Arrays.asList(
                mostInfo,
                new TvInfo("abc", "abc", null, null, null, null, null),
                new TvInfo("abc", null, null, null, null, null, null)
        ));

        TvInfo info = testee.findTvInfoInDatabase(new HashMap<>());
        assertEquals(mostInfo, info);
    }

}
