package org.nzbhydra.backup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.genericstorage.GenericStorage;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class BackupTaskTest {

    BaseConfig config = new BaseConfig();
    @Mock
    private BackupAndRestore backupAndRestore;
    @Mock
    private GenericStorage genericStorage;
    @Mock
    private ConfigProvider configProvider;
    @Captor
    private ArgumentCaptor<BackupData> backupDataArgumentCaptor;
    @InjectMocks
    private BackupTask testee = new BackupTask();

    @BeforeEach
    public void setUp() throws Exception {


        when(configProvider.getBaseConfig()).thenReturn(config);
        config.getMain().setBackupEveryXDays(7);

        testee.clock = Clock.fixed(Instant.ofEpochSecond(1502034366), ZoneId.of("UTC")); //Sunday

        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(2, ChronoUnit.DAYS)));
    }

    @Test
    void shouldCreateBackupIfEnabledAndNoBackupExecutedYet() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(200, ChronoUnit.DAYS)));

        testee.createBackup();
        verify(backupAndRestore).backup(false);
        verify(genericStorage).save(eq("BackupData"), backupDataArgumentCaptor.capture());
        BackupData backupData = backupDataArgumentCaptor.getValue();
        assertThat(backupData.getLastBackup()).isEqualTo(LocalDateTime.now(testee.clock));
    }

    @Test
    void shouldCreateBackupIfEnabledAndLastBackupAndStartupWasNotToday() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(200, ChronoUnit.DAYS)));

        when(genericStorage.get(BackupTask.KEY, BackupData.class)).thenReturn(Optional.of(new BackupData(LocalDateTime.now(testee.clock).minus(8, ChronoUnit.DAYS))));

        testee.createBackup();
        verify(backupAndRestore).backup(false);
        verify(genericStorage).save(eq("BackupData"), backupDataArgumentCaptor.capture());
        BackupData backupData = backupDataArgumentCaptor.getValue();
        assertThat(backupData.getLastBackup()).isEqualTo(LocalDateTime.now(testee.clock));
    }

    @Test
    void shouldNotCreateBackupIfEnabledAndLastBackupWasTooRecently() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock).minus(200, ChronoUnit.DAYS)));

        when(genericStorage.get(BackupTask.KEY, BackupData.class)).thenReturn(Optional.of(new BackupData(LocalDateTime.now(testee.clock).minus(5, ChronoUnit.DAYS))));

        testee.createBackup();
        verify(backupAndRestore, never()).backup(false);
        verify(genericStorage, never()).save(eq("BackupData"), backupDataArgumentCaptor.capture());
    }

    @Test
    void shouldNotCreateBackupIfDisabled() throws Exception {
        config.getMain().setBackupEveryXDays(null);
        testee.createBackup();
        verify(backupAndRestore, never()).backup(false);
    }

    @Test
    void shouldNotCreateBackupIfStartedToday() throws Exception {
        when(genericStorage.get("FirstStart", LocalDateTime.class)).thenReturn(Optional.of(LocalDateTime.now(testee.clock)));
        testee.createBackup();
        verify(backupAndRestore, never()).backup(false);
    }

    @Test
    void shouldNotCreateBackupIfLastBackupWasToday() throws Exception {
        when(genericStorage.get("BackupData", BackupData.class)).thenReturn(Optional.of(new BackupData(LocalDateTime.now(testee.clock))));
        testee.createBackup();
        verify(backupAndRestore, never()).backup(false);
    }

}
