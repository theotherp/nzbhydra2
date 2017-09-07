package org.nzbhydra.indexers;

import com.google.common.collect.Lists;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.mapping.newznab.Enclosure;
import org.nzbhydra.mapping.newznab.JaxbPubdateAdapter;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.RssGuid;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchResultItem;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@SuppressWarnings("ALL")
public class TorznabTest {

    private BaseConfig baseConfig;
    @Mock
    private InfoProvider infoProviderMock;
    @Mock
    private IndexerWebAccess indexerWebAccessMock;
    @Mock
    private IndexerEntity indexerEntityMock;
    @Mock
    private IndexerStatusEntity indexerStatusEntityMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    @Mock
    private IndexerSearchRepository indexerSearchRepositoryMock;
    @Mock
    private IndexerRepository indexerRepositoryMock;
    @Mock
    private IndexerApiAccessRepository indexerApiAccessRepositoryMock;
    @Mock
    private UriComponentsBuilder uriComponentsBuilderMock;
    @Captor
    private ArgumentCaptor<String> errorMessageCaptor;
    @Captor
    private ArgumentCaptor<Boolean> disabledPermanentlyCaptor;
    @Captor
    private ArgumentCaptor<? extends IndexerAccessResult> indexerApiAccessResultCaptor;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private SearchingConfig searchingConfigMock;

    @InjectMocks
    private Torznab testee = new Torznab();


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = spy(testee);

        when(indexerEntityMock.getStatus()).thenReturn(indexerStatusEntityMock);

        testee.config = new IndexerConfig();
        testee.config.setSupportedSearchIds(Lists.newArrayList(IdType.TMDB, IdType.TVRAGE));
        testee.config.setHost("http://127.0.0.1:1234");

        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.NONE);
        baseConfig.getSearching().setRemoveTrailing(Collections.emptyList());
    }


    @Test
    public void shouldCreateSearchResultItem() throws Exception {
        RssItem rssItem = buildBasicRssItem();
        rssItem.getTorznabAttributes().add(new NewznabAttribute("password", "0"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("group", "group"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("poster", "poster"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("size", "456"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("files", "10"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("grabs", "20"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("comments", "30"));
        rssItem.getTorznabAttributes().add(new NewznabAttribute("usenetdate", new JaxbPubdateAdapter().marshal(Instant.ofEpochSecond(6666666))));
        rssItem.setCategory("4000");

        SearchResultItem item = testee.createSearchResultItem(rssItem);
        assertThat(item.getLink(), is("http://indexer.com/123"));
        assertThat(item.getIndexerGuid(), is("http://indexer.com/123"));
        assertThat(item.getSize(), is(456L));
        assertThat(item.getCommentsLink(), is("http://indexer.com/123/details#comments"));
        assertThat(item.getDetails(), is("http://indexer.com/123"));
        assertThat(item.isAgePrecise(), is(true));
        assertThat(item.getGrabs(), is(20));
        assertThat(item.getDownloadType(), is(DownloadType.TORRENT));
    }

    private RssItem buildBasicRssItem() {
        RssItem rssItem = new RssItem();
        rssItem.setLink("http://indexer.com/123");
        rssItem.setRssGuid(new RssGuid("http://indexer.com/123", false));
        rssItem.setTitle("title");
        rssItem.setEnclosure(new Enclosure("http://indexer.com/123", 456L));
        rssItem.setPubDate(Instant.ofEpochSecond(5555555));
        rssItem.setDescription("description");
        rssItem.setComments("http://indexer.com/123/details#comments");
        rssItem.setTorznabAttributes(new ArrayList<>());
        return rssItem;
    }


}