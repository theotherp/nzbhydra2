/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class IndexerStatusesCleanupTaskTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private BaseConfig baseConfig;
    IndexerConfig indexerConfigEnabled = new IndexerConfig();
    IndexerConfig indexerConfigDisabledSystem = new IndexerConfig();
    IndexerConfig indexerConfigDisabledTempInTimeWindow = new IndexerConfig();
    IndexerConfig indexerConfigDisabledTempOutsideTimeWindow = new IndexerConfig();
    IndexerConfig indexerConfigUserDisabled = new IndexerConfig();

    private IndexerStatusesCleanupTask testee;


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = new IndexerStatusesCleanupTask(configProvider);
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
    }

    @Test
    public void shouldCleanup() {
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