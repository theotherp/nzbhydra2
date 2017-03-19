package org.nzbhydra.searching.infos;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

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

    @InjectMocks
    private InfoProvider testee = new InfoProvider();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);

        when(tvMazeHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TvMazeSearchResult("", "", "", "", null, ""));
        when(tvMazeHandlerMock.search(anyString())).thenReturn(Collections.singletonList(new TvMazeSearchResult("", "", "", "", null, "")));
        when(tmdbHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
        when(tmdbHandlerMock.search(anyString(), anyInt())).thenReturn(Collections.singletonList(new TmdbSearchResult(null, null, null, null, null)));
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
        for (InfoProvider.IdType type : Arrays.asList(InfoProvider.IdType.TVMAZE, InfoProvider.IdType.TVDB, InfoProvider.IdType.TVRAGE, InfoProvider.IdType.TVTITLE)) {
            reset(tvMazeHandlerMock);
            when(tvMazeHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TvMazeSearchResult("", "", "", "", null, ""));
            testee.convert("value", type);
            verify(tvMazeHandlerMock).getInfos("value", type);
        }
    }

    @Test
    public void shouldCallTmdb() throws Exception {
        for (InfoProvider.IdType type : Arrays.asList(InfoProvider.IdType.IMDB, InfoProvider.IdType.TMDB, InfoProvider.IdType.MOVIETITLE)) {
            reset(tmdbHandlerMock);
            when(tmdbHandlerMock.getInfos(anyString(), any(InfoProvider.IdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
            testee.convert("value", type);
            verify(tmdbHandlerMock).getInfos("value", type);
        }
    }

    @Test
    public void shouldSearch() throws Exception {
        testee.search("title", InfoProvider.IdType.TVTITLE);
        verify(tvMazeHandlerMock).search("title");

        testee.search("title", InfoProvider.IdType.MOVIETITLE);
        verify(tmdbHandlerMock).search("title", null);

    }

}