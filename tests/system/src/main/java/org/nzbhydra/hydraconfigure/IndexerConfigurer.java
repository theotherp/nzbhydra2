

package org.nzbhydra.hydraconfigure;

import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
public class IndexerConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(IndexerConfigurer.class);
    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    /**
     * The three mock indexers the baseline is made of, as configuration rather than as a write.
     *
     * <p>Handing back the list instead of saving it lets {@link org.nzbhydra.BeforeAll#applyBaseline()} establish the
     * whole baseline in a single {@code PUT /internalapi/config}. It used to take three - one here, one for the
     * downloader, one for the main settings - and each one that changed an indexer cost seconds.
     */
    public List<IndexerConfig> getMockIndexerConfigs() {
        logger.info("Building the three mock indexers using host " + mockUrl);
        final List<IndexerConfig> indexerConfigs = new ArrayList<>();
        for (int i = 1; i < 4; i++) {
            indexerConfigs.add(getIndexerConfig("Mock" + i, String.valueOf(i)));
        }
        return indexerConfigs;
    }

    public IndexerConfig getIndexerConfig(String name, String apikey) {
        IndexerConfig indexerConfig = new IndexerConfig();

        indexerConfig.setApiKey(apikey);
        indexerConfig.setName(name);
        indexerConfig.setHost(mockUrl);
        indexerConfig.setAllCapsChecked(true);
        indexerConfig.setSupportedSearchIds(Arrays.asList(MediaIdType.IMDB, MediaIdType.TVMAZE));
        indexerConfig.setSupportedSearchTypes(Arrays.asList(ActionAttribute.SEARCH, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE, ActionAttribute.BOOK));
        indexerConfig.setBackend(BackendType.NEWZNAB);
        final IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
        categoryMapping.setAnime(9090);
        categoryMapping.setEbook(7020);
        categoryMapping.setCategories(Arrays.asList(new IndexerCategoryConfig.MainCategory(2000, "Movies", Collections.singletonList(new IndexerCategoryConfig.SubCategory(2030, "Movies HD")))));
        indexerConfig.setCategoryMapping(categoryMapping);
        return indexerConfig;
    }
}
