package org.nzbhydra.externalapi;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.nzbhydra.backup.BackupEntry;
import org.nzbhydra.externalapi.v1.ExternalBackupEntry;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class ExternalBackupMapperTest {

    private final ExternalBackupMapper testee = new ExternalBackupMapper();

    @Test
    void shouldReadTheSizeFromTheFileBecauseTheInternalEntryDoesNotCarryIt(@TempDir File backupFolder) throws Exception {
        Instant created = Instant.parse("2026-09-09T12:00:00Z");
        Files.write(new File(backupFolder, "nzbhydra-2026-09-09.zip").toPath(), "PK-and-more".getBytes(StandardCharsets.UTF_8));

        ExternalBackupEntry entry = testee.toExternalBackupEntry(new BackupEntry("nzbhydra-2026-09-09.zip", created), backupFolder);

        assertThat(entry.getFilename()).isEqualTo("nzbhydra-2026-09-09.zip");
        assertThat(entry.getCreatedAt()).isEqualTo(created);
        assertThat(entry.getSizeBytes()).isEqualTo(11L);
    }

    @Test
    void shouldReportSizeZeroForAFileThatIsGone(@TempDir File backupFolder) {
        ExternalBackupEntry entry = testee.toExternalBackupEntry(
                new BackupEntry("gone.zip", Instant.parse("2026-09-09T12:00:00Z")), backupFolder);

        assertThat(entry.getSizeBytes()).isZero();
    }
}
