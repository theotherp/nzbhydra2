package org.nzbhydra.searching.searchmodules;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.internal.util.collections.Sets;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.infos.Info;
import org.nzbhydra.searching.infos.InfoProvider;
import org.nzbhydra.searching.infos.InfoProvider.IdType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

public class NewznabTest {

    @Mock
    private InfoProvider infoProviderMock;


    @InjectMocks
    private Newznab testee = new Newznab();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(infoProviderMock.canConvert(IdType.IMDB, IdType.TMDB)).thenReturn(true);
        Info info = new Info();
        info.setImdbId("imdbId");
        info.setTmdbId("tmdbId");
        info.setTvMazeId("tvMazeId");
        info.setTvRageId("tvRageId");
        info.setTvDbId("tvDbId");
        when(infoProviderMock.convert("imdbId", IdType.IMDB)).thenReturn(info);
        when(infoProviderMock.convert("tvMazeId", IdType.TVMAZE)).thenReturn(info);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Sets.newSet("tmdb", "tvrage"));
    }

    @Test
    public void shouldGetIdsIfNoneOfTheProvidedAreSupported() throws Exception {
        SearchRequest searchRequest = new SearchRequest(SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");
        searchRequest.getIdentifiers().put(IdType.TVMAZE, "tvMazeId");
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertTrue(params.containsKey("tmdbid"));
        assertTrue(params.containsKey("rid"));
        assertTrue(params.containsKey("tvmazeid"));

        verify(infoProviderMock, times(1)).convert(anyString(), any(IdType.class));
    }

    @Test
    public void shouldNotGetInfosIfAtLeastOneProvidedIsSupported() throws Exception {
        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Sets.newSet("imdb"));
        SearchRequest searchRequest = new SearchRequest(SearchType.SEARCH, 0, 100);
        searchRequest.getIdentifiers().put(IdType.IMDB, "imdbId");

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("http://www.indexerName.com/api");
        builder = testee.extendQueryWithSearchIds(searchRequest, builder);
        MultiValueMap<String, String> params = builder.build().getQueryParams();
        assertTrue(params.containsKey("imdbid"));
        assertEquals(1, params.size());
        verify(infoProviderMock, never()).convert(anyString(), any(IdType.class));
    }


}