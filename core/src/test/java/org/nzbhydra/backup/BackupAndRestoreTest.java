package org.nzbhydra.backup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class BackupAndRestoreTest {

    private static final DateTimeFormatter DATE_PATTERN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss");

    @Mock
    private ConfigProvider configProvider;

    private final BaseConfig config = new BaseConfig();

    private BackupAndRestore testee;

    @TempDir
    File tempDir;

    @BeforeEach
    void setUp() {
        lenient().when(configProvider.getBaseConfig()).thenReturn(config);
        config.getMain().setBackupFolder(tempDir.getAbsolutePath());
        testee = new BackupAndRestore();
        setField("configProvider", configProvider);
    }

    private void setField(String name, Object value) {
        try {
            final var field = BackupAndRestore.class.getDeclaredField(name);
            field.setAccessible(true);
            field.set(testee, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void shouldParseTimestampFromFilename() {
        LocalDateTime expected = LocalDateTime.of(2024, 7, 11, 22, 38, 16);
        String filename = "nzbhydra-" + expected.format(DATE_PATTERN) + ".zip";

        //Creation time and last modified are both set to something completely different to prove the
        //filename takes precedence
        Instant result = testee.determineBackupTimestamp(filename, Instant.now(), Instant.EPOCH);

        assertThat(result).isEqualTo(expected.atZone(ZoneId.systemDefault()).toInstant());
    }

    @Test
    void shouldFallBackToCreationTimeWhenFilenameDoesNotMatchAndCreationTimeIsUsable() {
        Instant creationTime = Instant.parse("2020-01-01T00:00:00Z");
        Instant lastModified = Instant.parse("2021-01-01T00:00:00Z");

        Instant result = testee.determineBackupTimestamp("somethingelse.zip", creationTime, lastModified);

        assertThat(result).isEqualTo(creationTime);
    }

    @Test
    void shouldFallBackToLastModifiedWhenFilenameDoesNotMatchAndCreationTimeIsEpoch() {
        Instant lastModified = Instant.parse("2021-01-01T00:00:00Z");

        Instant result = testee.determineBackupTimestamp("somethingelse.zip", Instant.EPOCH, lastModified);

        assertThat(result).isEqualTo(lastModified);
    }

    @Test
    void shouldReportRealDatesForExistingBackupsBasedOnFilename() throws IOException {
        //The filename format only has second precision, so truncate to avoid a precision mismatch
        LocalDateTime oldDate = LocalDateTime.now().minusWeeks(10).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        File backupFile = new File(tempDir, "nzbhydra-" + oldDate.format(DATE_PATTERN) + ".zip");
        Files.writeString(backupFile.toPath(), "content");

        List<BackupEntry> entries = testee.getExistingBackups();

        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getCreationDate()).isEqualTo(oldDate.atZone(ZoneId.systemDefault()).toInstant());
    }

    @Test
    void shouldDeleteOldBackupsWhenNewerSuccessfulBackupExists() throws IOException {
        config.getMain().setDeleteBackupsAfterWeeks(4);

        LocalDateTime oldDate = LocalDateTime.now().minusWeeks(10);
        LocalDateTime newDate = LocalDateTime.now().minusWeeks(1);
        File oldBackup = new File(tempDir, "nzbhydra-" + oldDate.format(DATE_PATTERN) + ".zip");
        File newBackup = new File(tempDir, "nzbhydra-" + newDate.format(DATE_PATTERN) + ".zip");
        Files.writeString(oldBackup.toPath(), "content");
        Files.writeString(newBackup.toPath(), "content");

        testee.deleteOldBackupFiles(tempDir);

        assertThat(oldBackup).doesNotExist();
        assertThat(newBackup).exists();
    }

    @Test
    void shouldNotDeleteOldBackupWhenNoNewerBackupExistsAtAll() throws IOException {
        config.getMain().setDeleteBackupsAfterWeeks(4);

        LocalDateTime oldDate = LocalDateTime.now().minusWeeks(10);
        File oldBackup = new File(tempDir, "nzbhydra-" + oldDate.format(DATE_PATTERN) + ".zip");
        Files.writeString(oldBackup.toPath(), "content");

        testee.deleteOldBackupFiles(tempDir);

        assertThat(oldBackup).exists();
    }

    @Test
    void shouldNotDeleteABackupThatHasNoNewerBackupEvenIfAnOlderOneExists() throws IOException {
        config.getMain().setDeleteBackupsAfterWeeks(4);

        //oldBackup is the most recent file of the two, so there's no backup newer than it - it must be kept.
        //olderBackup on the other hand does have a newer backup (oldBackup) and is beyond retention, so it's deleted.
        LocalDateTime oldDate = LocalDateTime.now().minusWeeks(10);
        LocalDateTime olderDate = LocalDateTime.now().minusWeeks(11);
        File oldBackup = new File(tempDir, "nzbhydra-" + oldDate.format(DATE_PATTERN) + ".zip");
        File olderBackup = new File(tempDir, "nzbhydra-" + olderDate.format(DATE_PATTERN) + ".zip");
        Files.writeString(oldBackup.toPath(), "content");
        Files.writeString(olderBackup.toPath(), "content");

        testee.deleteOldBackupFiles(tempDir);

        assertThat(oldBackup).exists();
        assertThat(olderBackup).doesNotExist();
    }

}
