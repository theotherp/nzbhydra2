package org.nzbhydra.indexers.capscheck;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.indexer.IndexerConfig;

import static org.assertj.core.api.Assertions.assertThat;

class IndexerCheckerTest {

    @Test
    void shouldSetApiHitLimitOnlyWhenNoGrabLimitIsReported() {
        IndexerConfig indexerConfig = new IndexerConfig();

        IndexerChecker.applyLimits(indexerConfig, 100, null);

        assertThat(indexerConfig.getHitLimit()).contains(100);
        assertThat(indexerConfig.getDownloadLimit()).isEmpty();
    }

    @Test
    void shouldSetGrabLimitOnlyWhenNoApiHitLimitIsReported() {
        IndexerConfig indexerConfig = new IndexerConfig();

        IndexerChecker.applyLimits(indexerConfig, null, 50);

        assertThat(indexerConfig.getHitLimit()).isEmpty();
        assertThat(indexerConfig.getDownloadLimit()).contains(50);
    }

    @Test
    void shouldSetBothLimitsWhenReported() {
        IndexerConfig indexerConfig = new IndexerConfig();

        IndexerChecker.applyLimits(indexerConfig, 100, 50);

        assertThat(indexerConfig.getHitLimit()).contains(100);
        assertThat(indexerConfig.getDownloadLimit()).contains(50);
    }

    @Test
    void shouldNotOverwriteConfiguredLimits() {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setHitLimit(1);
        indexerConfig.setDownloadLimit(2);

        IndexerChecker.applyLimits(indexerConfig, 100, 50);

        assertThat(indexerConfig.getHitLimit()).contains(1);
        assertThat(indexerConfig.getDownloadLimit()).contains(2);
    }

}
