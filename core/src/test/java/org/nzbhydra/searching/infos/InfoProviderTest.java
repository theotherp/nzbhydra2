package org.nzbhydra.searching.infos;

import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.database.MovieInfoRepository;
import org.nzbhydra.database.TvInfo;
import org.nzbhydra.database.TvInfoRepository;
import org.nzbhydra.searching.infos.InfoProvider.IdType;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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

        when(tvMazeHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TvMazeSearchResult("tvMazeId", "tvRageId", "tvDbId", "title", 0, "posterUrl"));
        when(tvMazeHandlerMock.search(anyString())).thenReturn(Collections.singletonList(new TvMazeSearchResult("tvMazeId", "tvRageId", "tvDbId", "title", 0, "posterUrl")));
        when(tmdbHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
        when(tmdbHandlerMock.search(anyString(), anyInt())).thenReturn(Collections.singletonList(new TmdbSearchResult(null, null, null, null, null)));

        when(tvInfoRepositoryMock.findByTitle(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByTvDbId(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByTvMazeId(anyString())).thenReturn(null);
        when(tvInfoRepositoryMock.findByTvRageId(anyString())).thenReturn(null);

        when(movieInfoRepository.findByTitle(anyString())).thenReturn(null);
        when(movieInfoRepository.findByImdbId(anyString())).thenReturn(null);
        when(movieInfoRepository.findByTmdbId(anyString())).thenReturn(null);
    }

    @Test
    public void canConvert() throws Exception {
        for (InfoProvider.IdType type : Arrays.asList(InfoProvider.IdType.IMDB, InfoProvider.IdType.TMDB, InfoProvider.IdType.MOVIETITLE)) {
            for (InfoProvider.IdType type2 : Arrays.asList(InfoProvider.IdType.IMDB, InfoProvider.IdType.TMDB, InfoProvider.IdType.MOVIETITLE)) {
                assertTrue(testee.canConvert(type, type2));
            }
        }

        for (InfoProvider.IdType type : Arrays.asList(InfoProvider.IdType.TVMAZE, InfoProvider.IdType.TVDB, InfoProvider.IdType.TVRAGE, InfoProvider.IdType.TVTITLE)) {
            for (InfoProvider.IdType type2 : Arrays.asList(InfoProvider.IdType.TVMAZE, InfoProvider.IdType.TVDB, InfoProvider.IdType.TVRAGE, InfoProvider.IdType.TVTITLE)) {
                assertTrue("Should be able to convert " + type + " to " + type2, testee.canConvert(type, type2));
            }
        }
    }

    @Test
    public void canConvertAny() throws Exception {
        assertTrue(testee.canConvertAny(Sets.newSet(InfoProvider.IdType.TVMAZE, InfoProvider.IdType.TVDB), Sets.newSet(IdType.TVRAGE)));
        assertTrue(testee.canConvertAny(Sets.newSet(InfoProvider.IdType.TVMAZE, InfoProvider.IdType.TVDB), Sets.newSet(IdType.TVMAZE)));
        assertTrue(testee.canConvertAny(Sets.newSet(InfoProvider.IdType.TVMAZE), Sets.newSet(IdType.TVMAZE, InfoProvider.IdType.TVDB)));

        assertFalse(testee.canConvertAny(Sets.newSet(), Sets.newSet(IdType.TVMAZE, InfoProvider.IdType.TVDB)));
        assertFalse(testee.canConvertAny(Sets.newSet(IdType.TVMAZE, InfoProvider.IdType.TVDB), Sets.newSet()));

        assertFalse(testee.canConvertAny(Sets.newSet(IdType.TVMAZE, InfoProvider.IdType.TVDB), Sets.newSet(IdType.TMDB)));
    }

    @Test
    public void shouldCatchUnexpectedError() throws Exception {
        when(tvMazeHandlerMock.getInfos(anyString(), eq(InfoProvider.IdType.TVDB))).thenThrow(IllegalArgumentException.class);
        try {
            testee.convert("", InfoProvider.IdType.TVDB);
            fail("Should've failed");
        } catch (Exception e) {
            assertEquals(InfoProviderException.class, e.getClass());
        }
    }

    @Test
    public void shouldCallTvMaze() throws Exception {
        ArgumentCaptor<TvInfo> tvInfoArgumentCaptor = ArgumentCaptor.forClass(TvInfo.class);
        for (InfoProvider.IdType type : Arrays.asList(InfoProvider.IdType.TVMAZE, InfoProvider.IdType.TVDB, InfoProvider.IdType.TVRAGE, InfoProvider.IdType.TVTITLE)) {
            reset(tvMazeHandlerMock);
            when(tvMazeHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TvMazeSearchResult("tvMazeId", "tvRageId", "tvDbId", "title", 0, "posterUrl"));
            testee.convert("value", type);
            verify(tvMazeHandlerMock).getInfos("value", type);
        }

        verify(tvInfoRepositoryMock).findByTvDbId("value");
        verify(tvInfoRepositoryMock).findByTvRageId("value");
        verify(tvInfoRepositoryMock).findByTvMazeId("value");
        verify(tvInfoRepositoryMock, times(4)).save(tvInfoArgumentCaptor.capture());
        assertEquals(4, tvInfoArgumentCaptor.getAllValues().size());
        assertEquals("title", tvInfoArgumentCaptor.getValue().getTitle());
        assertEquals("tvDbId", tvInfoArgumentCaptor.getValue().getTvDbId());
        assertEquals("tvMazeId", tvInfoArgumentCaptor.getValue().getTvMazeId());
        assertEquals("tvRageId", tvInfoArgumentCaptor.getValue().getTvRageId());
        assertEquals(Integer.valueOf(0), tvInfoArgumentCaptor.getValue().getYear());
    }

    @Test
    public void shouldCallTmdb() throws Exception {
        for (InfoProvider.IdType type : Arrays.asList(InfoProvider.IdType.IMDB, InfoProvider.IdType.TMDB, InfoProvider.IdType.MOVIETITLE)) {
            reset(tmdbHandlerMock);
            when(tmdbHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
            testee.convert("value", type);
            verify(tmdbHandlerMock).getInfos("value", type);
        }
        verify(movieInfoRepository).findByTmdbId("value");
        verify(movieInfoRepository).findByImdbId("value");
    }

    @Test
    public void shouldSearch() throws Exception {
        testee.search("title", InfoProvider.IdType.TVTITLE);
        verify(tvMazeHandlerMock).search("title");

        testee.search("title", InfoProvider.IdType.MOVIETITLE);
        verify(tmdbHandlerMock).search("title", null);

    }

}