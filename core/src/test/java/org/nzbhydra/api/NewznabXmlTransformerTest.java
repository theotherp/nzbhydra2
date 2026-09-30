

package org.nzbhydra.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.searching.SearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class NewznabXmlTransformerTest {

    @Mock
    protected FileHandler nzbHandler;
    @Mock
    protected ConfigProvider configProvider;
    @Mock
    private SearchResult searchResult;
    @Mock
    private DownloadUrlBuilder downloadUrlBuilder;

    @Mock
    private Indexer indexerMock;
    BaseConfig baseConfig = new BaseConfig();
    IndexerConfig indexerConfig = new IndexerConfig();


    @BeforeEach
    public void setUp() {

        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.setMain(new MainConfig());
        baseConfig.getMain().setApiKey("apikey");

        when(searchResult.getNumberOfAcceptedResults()).thenReturn(10);
        when(searchResult.getNumberOfProcessedResults()).thenReturn(10);
        when(searchResult.getNumberOfRejectedResults()).thenReturn(0);
        when(searchResult.getNumberOfRemovedDuplicates()).thenReturn(0);
        when(searchResult.getNumberOfTotalAvailableResults()).thenReturn(10);

        when(indexerMock.getConfig()).thenReturn(indexerConfig);
        indexerConfig.setHost("http://127.0.0.1");
    }

    @InjectMocks
    private NewznabXmlTransformer testee = new NewznabXmlTransformer();


    @Test
    void shouldUseCorrectApplicationType() {
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setSearchResultId(1L);
        searchResultItem.setIndexer(indexerMock);
        searchResultItem.setCategory(new Category());

        searchRequest.setDownloadType(DownloadType.NZB);
        NewznabXmlItem item = testee.buildRssItem(searchResultItem, searchRequest.getDownloadType() == DownloadType.NZB);
        assertThat(item.getEnclosure().getType()).isEqualTo("application/x-nzb");

        searchRequest.setDownloadType(DownloadType.TORRENT);
        item = testee.buildRssItem(searchResultItem, searchRequest.getDownloadType() == DownloadType.NZB);
        assertThat(item.getEnclosure().getType()).isEqualTo("application/x-bittorrent");

    }

    @Test
    void shouldKeepGuidAndLinkStableAcrossSearches() {
        //API clients (*arr, NZBGet RSS) recognize results they already know by GUID and link, so repeating a search must not change them
        when(downloadUrlBuilder.getDownloadLinkForResults(42L, false, DownloadType.NZB)).thenReturn("http://127.0.0.1:5076/getnzb/api/42?apikey=apikey");

        NewznabXmlItem firstItem = testee.buildRssItem(resultFromSearch(7), true);
        NewznabXmlItem secondItem = testee.buildRssItem(resultFromSearch(8), true);

        assertThat(firstItem.getRssGuid().getGuid()).isEqualTo("42");
        assertThat(secondItem.getRssGuid().getGuid()).isEqualTo(firstItem.getRssGuid().getGuid());
        assertThat(firstItem.getLink()).isEqualTo("http://127.0.0.1:5076/getnzb/api/42?apikey=apikey");
        assertThat(secondItem.getLink()).isEqualTo(firstItem.getLink());
        assertThat(guidAttribute(firstItem)).isEqualTo("42");
        assertThat(guidAttribute(secondItem)).isEqualTo("42");
    }

    private SearchResultItem resultFromSearch(int searchId) {
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setSearchResultId(42L);
        searchResultItem.setSearchId(searchId);
        searchResultItem.setGuid(42L);
        searchResultItem.setIndexer(indexerMock);
        searchResultItem.setCategory(new Category());
        return searchResultItem;
    }

    private String guidAttribute(NewznabXmlItem item) {
        return item.getNewznabAttributes().stream().filter(x -> x.getName().equals("guid")).map(NewznabAttribute::getValue).findFirst().orElse(null);
    }

    @Test
    void shouldEmitOneLanguageAndSubsAttributePerValue() {
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setSearchResultId(42L);
        searchResultItem.setGuid(42L);
        searchResultItem.setIndexer(indexerMock);
        searchResultItem.setCategory(new Category());
        searchResultItem.setLanguages(List.of("English", "Japanese"));
        searchResultItem.setSubs(List.of("Dutch", "English", "French"));
        searchResultItem.getAttributes().put("group", "alt.binaries.test");

        var item = testee.buildRssItem(searchResultItem, true);

        assertThat(item.getNewznabAttributes().stream().filter(x -> x.getName().equals("language")).map(NewznabAttribute::getValue)).containsExactly("English", "Japanese");
        assertThat(item.getNewznabAttributes().stream().filter(x -> x.getName().equals("subs")).map(NewznabAttribute::getValue)).containsExactly("Dutch", "English", "French");
        //Other attributes are forwarded untouched
        assertThat(item.getNewznabAttributes().stream().filter(x -> x.getName().equals("group")).map(NewznabAttribute::getValue)).containsExactly("alt.binaries.test");
    }

}
