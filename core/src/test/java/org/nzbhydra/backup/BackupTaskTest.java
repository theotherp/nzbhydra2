package org.nzbhydra.backup;

import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class BackupTaskTest {

    @Mock
    private BackupAndRestore backupAndRestore;
    @Mock
    private GenericStorage genericStorage;
    @Mock
    private ConfigProvider configProvider;
    @Captor
    private ArgumentCaptor<BackupData> backupDataArgumentCaptor;
    BaseConfig config = new BaseConfig();

    @InjectMocks
    private BackupTask testee = new BackupTask();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);

        when(configProvider.getBaseConfig()).thenReturn(config);
        config.getMain().setBackupEverySunday(true);

        testee.clock = Clock.fixed(Instant.ofEpochSecond(1502034366), ZoneId.of("UTC")); //Sunday

        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(2, ChronoUnit.DAYS)));
    }

    @Test
    public void shouldCreateBackupIfEnabledAndLastBackupAndStartupWasNotToday() throws Exception {
        testee.createBackup();
        verify(backupAndRestore).backup();
        verify(genericStorage).save(eq("BackupData"), backupDataArgumentCaptor.capture());
        BackupData backupData = backupDataArgumentCaptor.getValue();
        assertThat(backupData.getLastBackup(), is(LocalDateTime.now(testee.clock)));
    }

    @Test
    public void shouldNotCreateBackupIfDisabled() throws Exception {
        config.getMain().setBackupEverySunday(false);
        testee.createBackup();
        verify(backupAndRestore, never()).backup();
    }

    @Test
    public void shouldNotCreateBackupIfStartedToday() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock)));
        testee.createBackup();
        verify(backupAndRestore, never()).backup();
    }

    @Test
    public void shouldNotCreateBackupIfLastBackupWasToday() throws Exception {
        when(genericStorage.get("BackupData", BackupData.class)).thenReturn(Optional.of(new BackupData(LocalDateTime.now(testee.clock))));
        testee.createBackup();
        verify(backupAndRestore, never()).backup();
    }

}