package org.nzbhydra.indexers.status;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.SearchModuleProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IndexerStatusesAndLimitsTest {

    @Test
    void shouldConvertH2TimestampsAndLocalDateTimesToInstants() {
        Instant instant = Instant.parse("2026-07-28T17:00:00Z");

        assertThat(IndexerStatusesAndLimits.toInstant(Timestamp.from(instant))).isEqualTo(instant);
        assertThat(IndexerStatusesAndLimits.toInstant(LocalDateTime.ofInstant(instant, ZoneOffset.UTC))).isEqualTo(instant);
    }

    @Test
    void shouldOnlyLoadStatusesOfGivenIndexersInSortedOrder() {
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.getIndexers().add(indexerConfig("delta", IndexerConfig.State.ENABLED));
        baseConfig.getIndexers().add(indexerConfig("Charlie", IndexerConfig.State.DISABLED_USER));
        baseConfig.getIndexers().add(indexerConfig("bravo", IndexerConfig.State.ENABLED));
        baseConfig.getIndexers().add(indexerConfig("alpha", IndexerConfig.State.ENABLED));
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);

        SearchModuleProvider searchModuleProvider = mock(SearchModuleProvider.class);
        IndexerLimitRepository indexerLimitRepository = mock(IndexerLimitRepository.class);
        int id = 1;
        for (IndexerConfig config : baseConfig.getIndexers()) {
            IndexerEntity entity = new IndexerEntity(config.getName());
            entity.setId(id++);
            Indexer indexer = mock(Indexer.class);
            when(indexer.getIndexerEntity()).thenReturn(entity);
            when(searchModuleProvider.getIndexerByName(config.getName())).thenReturn(indexer);
            IndexerLimit limit = new IndexerLimit(entity);
            limit.setApiHits(1);
            limit.setDownloads(2);
            when(indexerLimitRepository.findByIndexer(entity)).thenReturn(limit);
        }

        IndexerStatusesAndLimits testee = new IndexerStatusesAndLimits();
        ReflectionTestUtils.setField(testee, "configProvider", configProvider);
        ReflectionTestUtils.setField(testee, "searchModuleProvider", searchModuleProvider);
        ReflectionTestUtils.setField(testee, "indexerLimitRepository", indexerLimitRepository);

        List<IndexerStatusesAndLimits.IndexerStatus> subset = testee.getSortedStatuses(Set.of("Charlie", "alpha", "delta"));

        assertThat(subset).extracting(IndexerStatusesAndLimits.IndexerStatus::getIndexer)
                .containsExactly("alpha", "delta", "Charlie");
        verify(searchModuleProvider, never()).getIndexerByName("bravo");
        verify(indexerLimitRepository, times(3)).findByIndexer(any());

        List<IndexerStatusesAndLimits.IndexerStatus> all = testee.getSortedStatuses();
        assertThat(all).extracting(IndexerStatusesAndLimits.IndexerStatus::getIndexer)
                .containsExactly("alpha", "bravo", "delta", "Charlie");
        assertThat(subset).containsExactly(all.get(0), all.get(2), all.get(3));
    }

    private static IndexerConfig indexerConfig(String name, IndexerConfig.State state) {
        IndexerConfig config = new IndexerConfig();
        config.setName(name);
        config.setState(state);
        return config;
    }
}
