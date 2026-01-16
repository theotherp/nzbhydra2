

package org.nzbhydra.indexers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class IndexerStatusesCleanupTaskTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private BaseConfig baseConfig;
    @Mock
    private ConfigReaderWriter configReaderWriterMock;
    @Mock
    private BaseConfigHandler baseConfigHandler;

    IndexerConfig indexerConfigEnabled = new IndexerConfig();
    IndexerConfig indexerConfigDisabledSystem = new IndexerConfig();
    IndexerConfig indexerConfigDisabledTempInTimeWindow = new IndexerConfig();
    IndexerConfig indexerConfigDisabledTempOutsideTimeWindow = new IndexerConfig();
    IndexerConfig indexerConfigUserDisabled = new IndexerConfig();

    @InjectMocks
    private IndexerStatusesCleanupTask testee;


    @BeforeEach
    public void setUp() throws Exception {

        testee = new IndexerStatusesCleanupTask(configProvider, baseConfigHandler);
        indexerConfigEnabled.setState(IndexerConfig.State.ENABLED);
        indexerConfigUserDisabled.setState(IndexerConfig.State.DISABLED_USER);
        indexerConfigDisabledSystem.setState(IndexerConfig.State.DISABLED_SYSTEM);

        indexerConfigDisabledTempInTimeWindow.setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        indexerConfigDisabledTempInTimeWindow.setDisabledUntil(Instant.now().plus(1, ChronoUnit.DAYS).toEpochMilli());
        indexerConfigDisabledTempInTimeWindow.setLastError("someerror");
        indexerConfigDisabledTempInTimeWindow.setDisabledLevel(1);

        indexerConfigDisabledTempOutsideTimeWindow.setState(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        indexerConfigDisabledTempOutsideTimeWindow.setDisabledUntil(Instant.now().minus(1, ChronoUnit.DAYS).toEpochMilli());
        indexerConfigDisabledTempOutsideTimeWindow.setLastError("someerror");
        indexerConfigDisabledTempOutsideTimeWindow.setDisabledLevel(1);
        when(baseConfig.getIndexers()).thenReturn(Arrays.asList(indexerConfigDisabledSystem, indexerConfigDisabledTempInTimeWindow, indexerConfigDisabledTempOutsideTimeWindow, indexerConfigEnabled, indexerConfigUserDisabled));
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        testee.configReaderWriter = configReaderWriterMock;
    }

    @Test
    void shouldCleanup() {
        testee.cleanup();

        //Was reenabled
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getState()).isEqualTo(IndexerConfig.State.ENABLED);
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getDisabledUntil()).isNull();
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getLastError()).isNull();
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getDisabledLevel()).isEqualTo(1); //was not reset, is only reset when an indexer is accessed successfully

        //Rest stayed the same
        assertThat(indexerConfigDisabledTempInTimeWindow.getState()).isEqualTo(IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY);
        assertThat(indexerConfigDisabledTempInTimeWindow.getDisabledUntil()).isNotNull();
        assertThat(indexerConfigDisabledTempInTimeWindow.getLastError()).isEqualTo("someerror");
        assertThat(indexerConfigDisabledTempInTimeWindow.getDisabledLevel()).isEqualTo(1);
        assertThat(indexerConfigEnabled.getState()).isEqualTo(IndexerConfig.State.ENABLED);
        assertThat(indexerConfigUserDisabled.getState()).isEqualTo(IndexerConfig.State.DISABLED_USER);
        assertThat(indexerConfigDisabledSystem.getState()).isEqualTo(IndexerConfig.State.DISABLED_SYSTEM);
    }
}
