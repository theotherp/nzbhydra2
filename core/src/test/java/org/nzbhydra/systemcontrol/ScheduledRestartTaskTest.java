/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.systemcontrol;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class ScheduledRestartTaskTest {

    BaseConfig config = new BaseConfig();
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private SystemControl systemControl;
    @Mock
    private GenericStorage genericStorage;
    @InjectMocks
    private ScheduledRestartTask testee = new ScheduledRestartTask();

    @BeforeEach
    public void setUp() {
        when(configProvider.getBaseConfig()).thenReturn(config);
    }

    @Test
    void shouldNotRestartWhenNoTimeConfigured() {
        config.getMain().setScheduledRestartTime(null);

        testee.checkForScheduledRestart();

        verify(systemControl, never()).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldNotRestartWhenEmptyTimeConfigured() {
        config.getMain().setScheduledRestartTime("");

        testee.checkForScheduledRestart();

        verify(systemControl, never()).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldNotRestartWhenInvalidTimeConfigured() {
        config.getMain().setScheduledRestartTime("invalid");

        testee.checkForScheduledRestart();

        verify(systemControl, never()).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldRestartAtConfiguredTime() {
        config.getMain().setScheduledRestartTime("15:30");
        // Set clock to 15:30
        ZonedDateTime fixedTime = ZonedDateTime.of(2024, 1, 15, 15, 30, 0, 0, ZoneId.systemDefault());
        testee.clock = Clock.fixed(fixedTime.toInstant(), ZoneId.systemDefault());

        when(genericStorage.get(eq("ScheduledRestartData"), eq(LocalDate.class))).thenReturn(Optional.empty());

        testee.checkForScheduledRestart();

        verify(systemControl).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
        verify(genericStorage).save(eq("ScheduledRestartData"), eq(LocalDate.of(2024, 1, 15)));
    }

    @Test
    void shouldNotRestartIfNotAtConfiguredTime() {
        config.getMain().setScheduledRestartTime("15:30");
        // Set clock to 14:30 (1 hour before)
        ZonedDateTime fixedTime = ZonedDateTime.of(2024, 1, 15, 14, 30, 0, 0, ZoneId.systemDefault());
        testee.clock = Clock.fixed(fixedTime.toInstant(), ZoneId.systemDefault());

        testee.checkForScheduledRestart();

        verify(systemControl, never()).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldNotRestartIfAlreadyRestartedToday() {
        config.getMain().setScheduledRestartTime("15:30");
        // Set clock to 15:30
        ZonedDateTime fixedTime = ZonedDateTime.of(2024, 1, 15, 15, 30, 0, 0, ZoneId.systemDefault());
        testee.clock = Clock.fixed(fixedTime.toInstant(), ZoneId.systemDefault());

        // Already restarted today
        when(genericStorage.get(eq("ScheduledRestartData"), eq(LocalDate.class)))
                .thenReturn(Optional.of(LocalDate.of(2024, 1, 15)));

        testee.checkForScheduledRestart();

        verify(systemControl, never()).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldRestartIfLastRestartWasYesterday() {
        config.getMain().setScheduledRestartTime("15:30");
        // Set clock to 15:30
        ZonedDateTime fixedTime = ZonedDateTime.of(2024, 1, 15, 15, 30, 0, 0, ZoneId.systemDefault());
        testee.clock = Clock.fixed(fixedTime.toInstant(), ZoneId.systemDefault());

        // Last restart was yesterday
        when(genericStorage.get(eq("ScheduledRestartData"), eq(LocalDate.class)))
                .thenReturn(Optional.of(LocalDate.of(2024, 1, 14)));

        testee.checkForScheduledRestart();

        verify(systemControl).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldHandleSingleDigitHour() {
        config.getMain().setScheduledRestartTime("3:30");
        // Set clock to 3:30
        ZonedDateTime fixedTime = ZonedDateTime.of(2024, 1, 15, 3, 30, 0, 0, ZoneId.systemDefault());
        testee.clock = Clock.fixed(fixedTime.toInstant(), ZoneId.systemDefault());

        when(genericStorage.get(eq("ScheduledRestartData"), eq(LocalDate.class))).thenReturn(Optional.empty());

        testee.checkForScheduledRestart();

        verify(systemControl).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }

    @Test
    void shouldHandleDoubleDigitHour() {
        config.getMain().setScheduledRestartTime("03:30");
        // Set clock to 3:30
        ZonedDateTime fixedTime = ZonedDateTime.of(2024, 1, 15, 3, 30, 0, 0, ZoneId.systemDefault());
        testee.clock = Clock.fixed(fixedTime.toInstant(), ZoneId.systemDefault());

        when(genericStorage.get(eq("ScheduledRestartData"), eq(LocalDate.class))).thenReturn(Optional.empty());

        testee.checkForScheduledRestart();

        verify(systemControl).exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);
    }
}
