package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.fortests.NewznabResponseBuilder;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.caps.CapsRoot;
import org.nzbhydra.mapping.newznab.caps.CapsSearch;
import org.nzbhydra.mapping.newznab.caps.CapsSearching;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.IMDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TMDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TRAKT;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVMAZE;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVRAGE;

@SuppressWarnings("ALL")
public class NewznabCheckerTest {


    private CapsRoot capsRoot;
    @Mock
    private IndexerWebAccess indexerWebAccess;
    @Mock
    private BaseConfig baseConfig;
    @Mock
    private SearchingConfig searchingConfig;
    @InjectMocks
    private NewznabChecker testee = new NewznabChecker();

    private IndexerConfig indexerConfig;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        indexerConfig = new IndexerConfig();
        indexerConfig.setHost("http://127.0.0.1:1234");
        indexerConfig.setApikey("apikey");
        when(searchingConfig.getTimeout()).thenReturn(1);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        capsRoot = new CapsRoot();
        capsRoot.setSearching(new CapsSearching());
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=caps", CapsRoot.class, 1))
                .thenReturn(capsRoot);
    }


    @Test
    public void shouldCheckCaps() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();
        RssRoot thronesResult = builder.getTestResult(1, 100, "Thrones", 0, 100);
        thronesResult.getRssChannel().setGenerator("nzedb");
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvdbid=121361", RssRoot.class, 1))
                .thenReturn(thronesResult);
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&rid=24493", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvmazeid=82", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&traktid=1390", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=movie&tmdbid=1399", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Avengers", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=movie&imdbid=0848228", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Avengers", 0, 100));

        capsRoot.getSearching().setAudioSearch(new CapsSearch("yes", "q"));

        NewznabChecker.CheckCapsRespone checkCapsRespone = testee.checkCaps(indexerConfig);
        assertEquals(6, checkCapsRespone.getSupportedSearchIds().size());
        assertTrue(checkCapsRespone.getSupportedSearchIds().contains(TVDB));
        assertTrue(checkCapsRespone.getSupportedSearchIds().contains(TVRAGE));
        assertTrue(checkCapsRespone.getSupportedSearchIds().contains(TVMAZE));
        assertTrue(checkCapsRespone.getSupportedSearchIds().contains(TRAKT));
        assertTrue(checkCapsRespone.getSupportedSearchIds().contains(IMDB));
        assertTrue(checkCapsRespone.getSupportedSearchIds().contains(TMDB));

        assertEquals(3, checkCapsRespone.getSupportedSearchTypes().size());
        assertTrue(checkCapsRespone.getSupportedSearchTypes().contains(ActionAttribute.AUDIO));
        assertTrue(checkCapsRespone.getSupportedSearchTypes().contains(ActionAttribute.TVSEARCH));
        assertTrue(checkCapsRespone.getSupportedSearchTypes().contains(ActionAttribute.MOVIE));

        assertEquals(BackendType.NZEDB, checkCapsRespone.getBackend());

        assertTrue(checkCapsRespone.isAllChecked());

        verify(indexerWebAccess, times(7)).get(anyString(), any(), anyInt());
    }

    @Test
    public void shouldCheckCapsWithoutSupport() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvdbid=121361", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&rid=24493", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvmazeid=82", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&traktid=1390", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=movie&tmdbid=1399", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=movie&imdbid=0848228", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));

        NewznabChecker.CheckCapsRespone checkCapsRespone = testee.checkCaps(indexerConfig);
        assertEquals(0, checkCapsRespone.getSupportedSearchIds().size());
        verify(indexerWebAccess, times(7)).get(anyString(), any(), anyInt());
    }

    @Test
    public void shouldSaySoIfNotAllWereChecked() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvdbid=121361", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&rid=24493", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvmazeid=82", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&traktid=1390", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=movie&tmdbid=1399", RssRoot.class, 1))
                .thenReturn(builder.getTestResult(1, 100, "Avengers", 0, 100));

        when(indexerWebAccess.get("http://127.0.0.1:1234/api?apikey=apikey&t=movie&imdbid=0848228", RssRoot.class, 1))
                .thenThrow(new IndexerAccessException("some error"));

        NewznabChecker.CheckCapsRespone checkCapsRespone = testee.checkCaps(indexerConfig);
        assertEquals(5, checkCapsRespone.getSupportedSearchIds().size());
        assertFalse(checkCapsRespone.isAllChecked());
        verify(indexerWebAccess, times(7)).get(anyString(), any(), anyInt());
    }


}