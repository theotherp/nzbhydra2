package org.nzbhydra.mediainfo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.internal.util.collections.Sets;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.mediainfo.MediaIdType;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
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
        //Once for the initial lookup and once for the re-check before saving
        verify(movieInfoRepository, times(2)).findByTmdbId("value");
        verify(movieInfoRepository, times(2)).findByImdbId("ttvalue");
    }

    protected void testConvertByType(MediaIdType type, String expectedValue) throws InfoProviderException {
        reset(tmdbHandlerMock);
        when(tmdbHandlerMock.getInfos(anyString(), any(MediaIdType.class))).thenReturn(new TmdbSearchResult(null, null, null, null, null));
        testee.convert("value", type);
        verify(tmdbHandlerMock).getInfos(expectedValue, type);
    }

    @Test
    void shouldNotMixUpIdsWithEqualHashes() throws Exception {
        //"Aa" and "BB" have the same String hash code, so Objects.hash is equal for both
        assertThat(Objects.hash("Aa", MediaIdType.TVDB)).isEqualTo(Objects.hash("BB", MediaIdType.TVDB));
        when(tvMazeHandlerMock.getInfos("Aa", MediaIdType.TVDB)).thenReturn(new TvMazeSearchResult("tvmazeId", "tvrageId", "Aa", "imdbId", "titleAa", 0, "posterUrl"));
        when(tvMazeHandlerMock.getInfos("BB", MediaIdType.TVDB)).thenReturn(new TvMazeSearchResult("tvmazeId", "tvrageId", "BB", "imdbId", "titleBB", 0, "posterUrl"));

        MediaInfo first = testee.convert("Aa", MediaIdType.TVDB);
        MediaInfo second = testee.convert("BB", MediaIdType.TVDB);

        assertThat(first.getTitle()).contains("titleAa");
        assertThat(second.getTitle()).contains("titleBB");
    }

    @Test
    void shouldServeRepeatedConversionFromCache() throws Exception {
        MediaInfo first = testee.convert("value", MediaIdType.TVDB);
        MediaInfo second = testee.convert("value", MediaIdType.TVDB);

        assertThat(second).isSameAs(first);
        verify(tvMazeHandlerMock, times(1)).getInfos("value", MediaIdType.TVDB);
    }

    @Test
    void shouldNotCacheFailedConversion() throws Exception {
        when(tvMazeHandlerMock.getInfos("value", MediaIdType.TVDB))
            .thenThrow(new InfoProviderException("TVMaze unreachable"))
            .thenReturn(new TvMazeSearchResult("tvmazeId", "tvrageId", "tvdbId", "imdbId", "title", 0, "posterUrl"));

        try {
            testee.convert("value", MediaIdType.TVDB);
            fail("Should've failed");
        } catch (InfoProviderException e) {
            assertThat(e.getMessage()).isEqualTo("TVMaze unreachable");
        }
        MediaInfo info = testee.convert("value", MediaIdType.TVDB);

        assertThat(info.getTitle()).contains("title");
        verify(tvMazeHandlerMock, times(2)).getInfos("value", MediaIdType.TVDB);
    }

    @Test
    void shouldNotBlockConversionOfOtherIdWhileLookupIsRunning() throws Exception {
        CountDownLatch slowLookupStarted = new CountDownLatch(1);
        CountDownLatch releaseSlowLookup = new CountDownLatch(1);
        when(tvMazeHandlerMock.getInfos("slow", MediaIdType.TVDB)).thenAnswer(invocation -> {
            slowLookupStarted.countDown();
            releaseSlowLookup.await(10, TimeUnit.SECONDS);
            return new TvMazeSearchResult("tvmazeId", "tvrageId", "slow", "imdbId", "slowTitle", 0, "posterUrl");
        });
        when(tvMazeHandlerMock.getInfos("fast", MediaIdType.TVMAZE)).thenReturn(new TvMazeSearchResult("fast", "tvrageId", "tvdbId", "imdbId", "fastTitle", 0, "posterUrl"));

        //The test is only meaningful if both keys use different lock stripes. Key hash codes are stable across JVM runs.
        assertThat(testee.conversionLockFor(new InfoProvider.MediaInfoKey("slow", MediaIdType.TVDB)))
            .isNotSameAs(testee.conversionLockFor(new InfoProvider.MediaInfoKey("fast", MediaIdType.TVMAZE)));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MediaInfo> slow = executor.submit(() -> testee.convert("slow", MediaIdType.TVDB));
            assertThat(slowLookupStarted.await(5, TimeUnit.SECONDS)).isTrue();

            Future<MediaInfo> fast = executor.submit(() -> testee.convert("fast", MediaIdType.TVMAZE));
            assertThat(fast.get(5, TimeUnit.SECONDS).getTitle()).contains("fastTitle");
            assertThat(slow.isDone()).isFalse();

            releaseSlowLookup.countDown();
            assertThat(slow.get(5, TimeUnit.SECONDS).getTitle()).contains("slowTitle");
        } finally {
            releaseSlowLookup.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void shouldLookUpSameIdOnlyOnceWhenRequestedConcurrently() throws Exception {
        CountDownLatch lookupStarted = new CountDownLatch(1);
        CountDownLatch releaseLookup = new CountDownLatch(1);
        when(tvMazeHandlerMock.getInfos("value", MediaIdType.TVDB)).thenAnswer(invocation -> {
            lookupStarted.countDown();
            releaseLookup.await(10, TimeUnit.SECONDS);
            return new TvMazeSearchResult("tvmazeId", "tvrageId", "value", "imdbId", "title", 0, "posterUrl");
        });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MediaInfo> first = executor.submit(() -> testee.convert("value", MediaIdType.TVDB));
            assertThat(lookupStarted.await(5, TimeUnit.SECONDS)).isTrue();
            Future<MediaInfo> second = executor.submit(() -> testee.convert("value", MediaIdType.TVDB));

            releaseLookup.countDown();
            assertThat(second.get(5, TimeUnit.SECONDS)).isSameAs(first.get(5, TimeUnit.SECONDS));
            verify(tvMazeHandlerMock, times(1)).getInfos("value", MediaIdType.TVDB);
        } finally {
            releaseLookup.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void shouldUseTvInfoSavedConcurrentlyInsteadOfSavingAgain() throws Exception {
        TvInfo existing = new TvInfo("tvdbId", "tvrageId", "tvmazeId", "ttimdbId", "existingTitle", 2000, "existingPosterUrl");
        //Not in the database at the first lookup, saved by another conversion before this one saves
        when(tvInfoRepositoryMock.findByTvdbId("tvdbId")).thenReturn(null).thenReturn(existing);
        when(tvMazeHandlerMock.getInfos("tvdbId", MediaIdType.TVDB)).thenReturn(new TvMazeSearchResult("tvmazeId", "tvrageId", "tvdbId", "imdbId", "remoteTitle", 2000, "posterUrl"));

        MediaInfo info = testee.convert("tvdbId", MediaIdType.TVDB);

        assertThat(info.getTitle()).contains("existingTitle");
        assertThat(info.getPosterUrl()).contains("existingPosterUrl");
        verify(tvInfoRepositoryMock, times(2)).findByTvdbId("tvdbId");
        verify(tvInfoRepositoryMock, never()).save(any(TvInfo.class));
    }

    @Test
    void shouldUseMovieInfoSavedConcurrentlyInsteadOfSavingAgain() throws Exception {
        MovieInfo existing = new MovieInfo("tt0001", "1234", "existingTitle", 2000, "existingPosterUrl");
        //Not in the database at the first lookup, saved by another conversion before this one saves
        when(movieInfoRepository.findByTmdbId("1234")).thenReturn(null).thenReturn(existing);
        when(tmdbHandlerMock.getInfos("1234", MediaIdType.TMDB)).thenReturn(new TmdbSearchResult("1234", "tt0001", "remoteTitle", "posterUrl", 2000));

        MediaInfo info = testee.convert("1234", MediaIdType.TMDB);

        assertThat(info.getTitle()).contains("existingTitle");
        assertThat(info.getPosterUrl()).contains("existingPosterUrl");
        verify(movieInfoRepository, times(2)).findByTmdbId("1234");
        verify(movieInfoRepository, never()).save(any(MovieInfo.class));
    }

    @Test
    void shouldSaveMovieInfoWithoutQueryingByMissingIds() throws Exception {
        when(tmdbHandlerMock.getInfos("1234", MediaIdType.TMDB)).thenReturn(new TmdbSearchResult("1234", null, "title", "posterUrl", 2000));

        testee.convert("1234", MediaIdType.TMDB);

        verify(movieInfoRepository, never()).findByImdbId(any());
        verify(movieInfoRepository).save(any(MovieInfo.class));
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

    @Test
    void shouldSaveTvInfoFromTitleSearchWhenNotYetInDatabase() throws Exception {
        when(tvInfoRepositoryMock.findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(anyString(), anyString(), anyString(), anyString())).thenReturn(Collections.emptyList());

        testee.search("title", MediaIdType.TVTITLE);

        verify(tvInfoRepositoryMock).save(any(TvInfo.class));
    }

    @Test
    void shouldNotSaveTvInfoFromTitleSearchWhenAlreadyInDatabase() throws Exception {
        when(tvInfoRepositoryMock.findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(anyString(), anyString(), anyString(), anyString())).thenReturn(Collections.singletonList(new TvInfo("tvdbId", "tvrageId", "tvmazeId", "imdbId", "title", null, null)));

        testee.search("title", MediaIdType.TVTITLE);

        verify(tvInfoRepositoryMock, never()).save(any(TvInfo.class));
    }

}
