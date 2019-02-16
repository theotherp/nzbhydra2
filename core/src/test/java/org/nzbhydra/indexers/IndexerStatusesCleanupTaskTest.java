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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerState;

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
    @Mock
    private IndexerRepository indexerRepositoryMock;

    IndexerEntity indexerConfigEnabled = new IndexerEntity();
    IndexerEntity indexerConfigDisabledSystem = new IndexerEntity();
    IndexerEntity indexerConfigDisabledTempInTimeWindow = new IndexerEntity();
    IndexerEntity indexerConfigDisabledTempOutsideTimeWindow = new IndexerEntity();
    IndexerEntity indexerConfigUserDisabled = new IndexerEntity();

    @InjectMocks
    private IndexerStatusesCleanupTask testee;


    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee = new IndexerStatusesCleanupTask();
        indexerConfigEnabled.setState(IndexerState.ENABLED);
        indexerConfigUserDisabled.setState(IndexerState.DISABLED_USER);
        indexerConfigDisabledSystem.setState(IndexerState.DISABLED_SYSTEM);

        indexerConfigDisabledTempInTimeWindow.setState(IndexerState.DISABLED_SYSTEM_TEMPORARY);
        indexerConfigDisabledTempInTimeWindow.setDisabledUntil(Instant.now().plus(1, ChronoUnit.DAYS));
        indexerConfigDisabledTempInTimeWindow.setLastError("someerror");
        indexerConfigDisabledTempInTimeWindow.setDisabledLevel(1);

        indexerConfigDisabledTempOutsideTimeWindow.setState(IndexerState.DISABLED_SYSTEM_TEMPORARY);
        indexerConfigDisabledTempOutsideTimeWindow.setDisabledUntil(Instant.now().minus(1, ChronoUnit.DAYS));
        indexerConfigDisabledTempOutsideTimeWindow.setLastError("someerror");
        indexerConfigDisabledTempOutsideTimeWindow.setDisabledLevel(1);
        when(indexerRepositoryMock.findAll()).thenReturn(Arrays.asList(indexerConfigDisabledSystem, indexerConfigDisabledTempInTimeWindow, indexerConfigDisabledTempOutsideTimeWindow, indexerConfigEnabled, indexerConfigUserDisabled));
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        testee.indexerRepository = indexerRepositoryMock;
    }

    @Test
    public void shouldCleanup() {
        testee.cleanup();

        //Was reenabled
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getState()).isEqualTo(IndexerState.ENABLED);
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getDisabledUntil()).isNull();
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getLastError()).isNull();
        assertThat(indexerConfigDisabledTempOutsideTimeWindow.getDisabledLevel()).isEqualTo(1); //was not reset, is only reset when an indexer is accessed successfully

        //Rest stayed the same
        assertThat(indexerConfigDisabledTempInTimeWindow.getState()).isEqualTo(IndexerState.DISABLED_SYSTEM_TEMPORARY);
        assertThat(indexerConfigDisabledTempInTimeWindow.getDisabledUntil()).isNotNull();
        assertThat(indexerConfigDisabledTempInTimeWindow.getLastError()).isEqualTo("someerror");
        assertThat(indexerConfigDisabledTempInTimeWindow.getDisabledLevel()).isEqualTo(1);
        assertThat(indexerConfigEnabled.getState()).isEqualTo(IndexerState.ENABLED);
        assertThat(indexerConfigUserDisabled.getState()).isEqualTo(IndexerState.DISABLED_USER);
        assertThat(indexerConfigDisabledSystem.getState()).isEqualTo(IndexerState.DISABLED_SYSTEM);
    }
}