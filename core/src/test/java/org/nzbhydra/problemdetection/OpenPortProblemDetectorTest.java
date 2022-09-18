/*
 *  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.problemdetection;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.misc.OpenPortChecker;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class OpenPortProblemDetectorTest {

    @Mock
    private GenericStorage genericStorage;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private OpenPortChecker openPortChecker;

    @InjectMocks
    private OpenPortProblemDetector testee;

    private final BaseConfig baseConfig = new BaseConfig();

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getAuth().setAuthType(AuthType.NONE);
        when(openPortChecker.getPublicIp()).thenReturn("publicIp");
    }

    @Test
    public void shouldNotCheckWithAuth() {
        baseConfig.getAuth().setAuthType(AuthType.FORM);

        testee.executeCheck();

        verifyNoMoreInteractions(genericStorage);
    }

    @Test
    public void shouldNotCheckAgainIfTooSoon() {
        when(genericStorage.get(OpenPortProblemDetector.KEY, Instant.class)).thenReturn(Optional.ofNullable(Instant.now()));

        testee.executeCheck();

        verify(genericStorage, never()).setNoSave(any(), any());
        verify(genericStorage, never()).save(any(), any());
    }

    @Test
    public void shouldNotWarnIfPortIsClosed() {
        when(openPortChecker.isPortOpen(any(), any())).thenReturn(false);

        testee.executeCheck();

        verify(genericStorage, never()).save(eq(OpenPortProblemDetector.WARNING_KEY), any());
    }

    @Test
    public void shouldWarnIfPortIsOpen() {
        when(openPortChecker.isPortOpen(any(), any())).thenReturn(true);

        testee.executeCheck();

        verify(genericStorage).setNoSave(eq(OpenPortProblemDetector.KEY), any(Instant.class));
        verify(genericStorage).save(OpenPortProblemDetector.WARNING_KEY, true);
    }

}
