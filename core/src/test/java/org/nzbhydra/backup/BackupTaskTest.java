package org.nzbhydra.backup;

import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
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
import static org.mockito.Mockito.*;

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
        config.getMain().setBackupEveryXDays(7);

        testee.clock = Clock.fixed(Instant.ofEpochSecond(1502034366), ZoneId.of("UTC")); //Sunday

        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(2, ChronoUnit.DAYS)));
    }

    @Test
    public void shouldCreateBackupIfEnabledAndNoBackupExecutedYet() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(200, ChronoUnit.DAYS)));

        testee.createBackup();
        verify(backupAndRestore).backup();
        verify(genericStorage).save(eq("BackupData"), backupDataArgumentCaptor.capture());
        BackupData backupData = backupDataArgumentCaptor.getValue();
        assertThat(backupData.getLastBackup(), is(LocalDateTime.now(testee.clock)));
    }

    @Test
    public void shouldCreateBackupIfEnabledAndLastBackupAndStartupWasNotToday() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(200, ChronoUnit.DAYS)));

        when(genericStorage.get(BackupTask.KEY, BackupData.class)).thenReturn(Optional.of(new BackupData(LocalDateTime.now(testee.clock).minus(8, ChronoUnit.DAYS))));

        testee.createBackup();
        verify(backupAndRestore).backup();
        verify(genericStorage).save(eq("BackupData"), backupDataArgumentCaptor.capture());
        BackupData backupData = backupDataArgumentCaptor.getValue();
        assertThat(backupData.getLastBackup(), is(LocalDateTime.now(testee.clock)));
    }

    @Test
    public void shouldNotCreateBackupIfEnabledAndLastBackupWasTooRecently() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(200, ChronoUnit.DAYS)));

        when(genericStorage.get(BackupTask.KEY, BackupData.class)).thenReturn(Optional.of(new BackupData(LocalDateTime.now(testee.clock).minus(5, ChronoUnit.DAYS))));

        testee.createBackup();
        verify(backupAndRestore, never()).backup();
        verify(genericStorage, never()).save(eq("BackupData"), backupDataArgumentCaptor.capture());
    }

    @Test
    public void shouldNotCreateBackupIfDisabled() throws Exception {
        config.getMain().setBackupEveryXDays(null);
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