package org.nzbhydra.config.safeconfig;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.indexer.IndexerConfig;

import static org.assertj.core.api.Assertions.assertThat;

public class SafeIndexerConfigTest {

    @Test
    void shouldShowIndexerOnSearchOnlyIfEnabledForInternalSearches() {
        assertThat(showOnSearch(SearchSourceRestriction.BOTH)).isTrue();
        assertThat(showOnSearch(SearchSourceRestriction.INTERNAL)).isTrue();
        assertThat(showOnSearch(SearchSourceRestriction.ALL_BUT_RSS)).isTrue();
        assertThat(showOnSearch(SearchSourceRestriction.API)).isFalse();
        assertThat(showOnSearch(SearchSourceRestriction.ONLY_RSS)).isFalse();
        assertThat(showOnSearch(SearchSourceRestriction.NONE)).isFalse();
    }

    @Test
    void shouldNotShowIndexerOnSearchIfHiddenByUser() {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setShowOnSearch(false);

        assertThat(new SafeIndexerConfig(indexerConfig, new BaseConfig()).isShowOnSearch()).isFalse();
    }

    private boolean showOnSearch(SearchSourceRestriction restriction) {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setEnabledForSearchSource(restriction);
        return new SafeIndexerConfig(indexerConfig, new BaseConfig()).isShowOnSearch();
    }
}
