package org.nzbhydra.backup;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.misc.TempFileProvider;
import org.nzbhydra.systemcontrol.SystemControl;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BackupAndRestoreTest {

    private static final DateTimeFormatter DATE_PATTERN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss");

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private EntityManager entityManager;
    @Mock
    private TempFileProvider tempFileProvider;
    @Mock
    private SystemControl systemControl;

    private final BaseConfig config = new BaseConfig();

    private BackupAndRestore testee;

    @TempDir
    File tempDir;

    private String originalDataFolder;

    @BeforeEach
    void setUp() {
        lenient().when(configProvider.getBaseConfig()).thenReturn(config);
        config.getMain().setBackupFolder(tempDir.getAbsolutePath());
        testee = new BackupAndRestore();
        setField("configProvider", configProvider);
        setField("entityManager", entityManager);
        setField("tempFileProvider", tempFileProvider);
        setField("systemControl", systemControl);
        originalDataFolder = NzbHydra.getDataFolder();
    }

    @AfterEach
    void tearDown() {
        NzbHydra.setDataFolder(originalDataFolder);
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

    @Test
    void shouldEncryptSensitiveDataInBackup() throws Exception {
        setSecrets();
        mockDatabaseBackup();

        File backupZip = testee.backup(true);

        String backedUpConfig = readConfigFromZip(backupZip);
        assertThat(backedUpConfig).doesNotContain("mainApiKeySecret", "indexerApiKeySecret", "indexerPasswordSecret");
        assertThat(backedUpConfig).contains("{OBF}");
        //The running config must not be changed by the backup
        assertThat(config.getMain().getApiKey()).isEqualTo("mainApiKeySecret");
        assertThat(config.getIndexers().get(0).getApiKey()).isEqualTo("indexerApiKeySecret");
    }

    @Test
    void shouldRestoreEncryptedBackup() throws Exception {
        setSecrets();
        mockDatabaseBackup();
        File backupZip = testee.backup(true);

        BaseConfig restored = restoreAndLoad(backupZip);

        assertRestoredSecrets(restored);
    }

    @Test
    void shouldRestorePlaintextBackupFromOlderVersions() throws Exception {
        setSecrets();
        //Older versions wrote the config to the backup without encrypting it
        String plaintextConfig = new ConfigReaderWriter().getAsYamlString(config);
        assertThat(plaintextConfig).contains("mainApiKeySecret", "indexerApiKeySecret");
        File backupZip = new File(tempDir, "nzbhydra-old.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(backupZip.toPath()))) {
            zip.putNextEntry(new ZipEntry("nzbhydra.yml"));
            zip.write(plaintextConfig.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }

        BaseConfig restored = restoreAndLoad(backupZip);

        assertRestoredSecrets(restored);
    }

    private void setSecrets() {
        config.getMain().setApiKey("mainApiKeySecret");
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName("indexer1");
        indexerConfig.setApiKey("indexerApiKeySecret");
        indexerConfig.setUsername("indexerUser");
        indexerConfig.setPassword("indexerPasswordSecret");
        config.getIndexers().add(indexerConfig);
    }

    private void assertRestoredSecrets(BaseConfig restored) {
        assertThat(restored.getMain().getApiKey()).isEqualTo("mainApiKeySecret");
        assertThat(restored.getIndexers()).hasSize(1);
        assertThat(restored.getIndexers().get(0).getApiKey()).isEqualTo("indexerApiKeySecret");
        assertThat(restored.getIndexers().get(0).getUsername()).contains("indexerUser");
        assertThat(restored.getIndexers().get(0).getPassword()).contains("indexerPasswordSecret");
    }

    /**
     * Extracts the backup like a restore does and then lets the wrapper's part - moving the restored config into
     * place - happen, before loading the config like on startup.
     */
    private BaseConfig restoreAndLoad(File backupZip) throws IOException {
        File dataFolder = new File(tempDir, "data");
        Files.createDirectories(dataFolder.toPath());
        NzbHydra.setDataFolder(dataFolder.getAbsolutePath());

        testee.restoreFromFile(backupZip);

        Files.copy(new File(dataFolder, "restore/nzbhydra.yml").toPath(), new File(dataFolder, "nzbhydra.yml").toPath(), StandardCopyOption.REPLACE_EXISTING);
        return new ConfigReaderWriter().loadSavedConfig();
    }

    /**
     * The database backup is done by H2. Here it just creates the ZIP the config is then added to.
     */
    private void mockDatabaseBackup() throws IOException {
        when(tempFileProvider.getTempFile(anyString(), anyString())).thenReturn(new File(tempDir, "databaseTest.zip"));
        when(entityManager.createNativeQuery(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            Query query = mock(Query.class);
            if (sql.startsWith("BACKUP TO '")) {
                String target = sql.substring("BACKUP TO '".length(), sql.lastIndexOf('\''));
                when(query.executeUpdate()).thenAnswer(x -> {
                    try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(new File(target).toPath()))) {
                        zip.putNextEntry(new ZipEntry("database.mv.db"));
                        zip.closeEntry();
                    }
                    return 0;
                });
            }
            return query;
        });
    }

    private String readConfigFromZip(File zipFile) throws IOException {
        try (FileSystem fs = FileSystems.newFileSystem(URI.create("jar:" + zipFile.toPath().toUri()), Map.of())) {
            return Files.readString(fs.getPath("nzbhydra.yml"));
        }
    }

}
