package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.fortests.NewznabResponseBuilder;
import org.nzbhydra.rssmapping.RssRoot;
import org.springframework.web.client.RestTemplate;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.when;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.IMDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TMDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TRAKT;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVMAZE;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVRAGE;

@SuppressWarnings("ALL")
public class NewznabCheckerTest {


    @Mock
    private RestTemplate restTemplateMock;
    @InjectMocks
    private NewznabChecker testee = new NewznabChecker();

    private IndexerConfig indexerConfig;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        indexerConfig = new IndexerConfig();
        indexerConfig.setHost("http://127.0.0.1:1234");
        indexerConfig.setApikey("apikey");
    }


    @Test
    public void shouldCheckCaps() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvdbid=121361", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&rid=24493", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvmazeid=82", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&traktid=1390", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "Thrones", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=movie&tmdbid=1399", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "Avengers", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=movie&imdbid=0848228", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "Avengers", 0, 100));

        NewznabChecker.CheckCapsRespone checkCapsRespone = testee.checkCaps(indexerConfig);
        assertEquals(6, checkCapsRespone.getSupportedIds().size());
        assertTrue(checkCapsRespone.getSupportedIds().contains(TVDB));
        assertTrue(checkCapsRespone.getSupportedIds().contains(TVRAGE));
        assertTrue(checkCapsRespone.getSupportedIds().contains(TVMAZE));
        assertTrue(checkCapsRespone.getSupportedIds().contains(TRAKT));
        assertTrue(checkCapsRespone.getSupportedIds().contains(IMDB));
        assertTrue(checkCapsRespone.getSupportedIds().contains(TMDB));
    }

    @Test
    public void shouldCheckCapsWithoutSupport() throws Exception {
        NewznabResponseBuilder builder = new NewznabResponseBuilder();
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvdbid=121361", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&rid=24493", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&tvmazeid=82", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=tvsearch&traktid=1390", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=movie&tmdbid=1399", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));
        when(restTemplateMock.getForObject("http://127.0.0.1:1234/api?apikey=apikey&t=movie&imdbid=0848228", RssRoot.class))
                .thenReturn(builder.getTestResult(1, 100, "somethingElse", 0, 100));

        NewznabChecker.CheckCapsRespone checkCapsRespone = testee.checkCaps(indexerConfig);
        assertEquals(0, checkCapsRespone.getSupportedIds().size());
    }


}