

package org.nzbhydra.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mapping.newznab.json.NewznabJsonItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class NewznabJsonTransformerTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private DownloadUrlBuilder downloadUrlBuilder;
    @Mock
    private Indexer indexerMock;
    private final BaseConfig baseConfig = new BaseConfig();
    private final IndexerConfig indexerConfig = new IndexerConfig();

    @InjectMocks
    private NewznabJsonTransformer testee = new NewznabJsonTransformer();

    @BeforeEach
    public void setUp() {
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.setMain(new MainConfig());
        baseConfig.getMain().setApiKey("apikey");
        when(indexerMock.getConfig()).thenReturn(indexerConfig);
        indexerConfig.setHost("http://127.0.0.1");
    }

    @Test
    void shouldEmitOneLanguageAndSubsAttributePerValue() {
        SearchResultItem searchResultItem = new SearchResultItem();
        searchResultItem.setSearchResultId(42L);
        searchResultItem.setGuid(42L);
        searchResultItem.setIndexer(indexerMock);
        searchResultItem.setCategory(new Category());
        searchResultItem.setSize(1L);
        searchResultItem.setPubDate(java.time.Instant.now());
        searchResultItem.setLanguages(List.of("English", "Japanese"));
        searchResultItem.setSubs(List.of("Dutch", "English", "French"));

        NewznabJsonItem item = testee.buildRssItem(searchResultItem, true);

        assertThat(item.getAttr().stream().filter(x -> x.getAttributes().getName().equals("language")).map(x -> x.getAttributes().getValue())).containsExactly("English", "Japanese");
        assertThat(item.getAttr().stream().filter(x -> x.getAttributes().getName().equals("subs")).map(x -> x.getAttributes().getValue())).containsExactly("Dutch", "English", "French");
    }
}
