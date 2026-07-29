package org.nzbhydra;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.backup.BackupEntry;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class BackupRestoreSystemTest {

    @Autowired
    private HydraClient hydraClient;
    @Autowired
    private Searcher searcher;
    @Value("${dataFolder.testaccess}")
    private Path dataFolder;

    private BaseConfig originalConfig;

    @BeforeEach
    public void setUp() {
        originalConfig = getConfig();
    }

    @AfterEach
    public void restoreConfiguration() {
        waitUntilHealthy();
        if (originalConfig != null) {
            assertSuccessfulSave(originalConfig);
        }
    }

    @Test
    public void shouldRestoreConfigurationAndDatabaseFromBackup() throws Exception {
        String backupMarker = "backup-marker-" + UUID.randomUUID();
        String postBackupMarker = "post-backup-marker-" + UUID.randomUUID();
        BaseConfig backupConfig = getConfig();
        backupConfig.getSearching().setUserAgent(backupMarker);
        assertSuccessfulSave(backupConfig);

        String preBackupQuery = "backup-history-before-" + UUID.randomUUID();
        createAndWaitForHistory(preBackupQuery);
        BackupEntry backup = createBackupAndFindNew();

        BaseConfig changedConfig = getConfig();
        changedConfig.getSearching().setUserAgent(postBackupMarker);
        assertSuccessfulSave(changedConfig);
        String postBackupQuery = "backup-history-after-" + UUID.randomUUID();
        createAndWaitForHistory(postBackupQuery);

        HydraResponse restoreResponse = hydraClient.get("/internalapi/backup/restore", "filename=" + backup.getFilename());
        GenericResponse restoreResult = restoreResponse.as(GenericResponse.class);
        assertThat(restoreResponse.status()).isEqualTo(200);
        assertThat(restoreResult.isSuccessful()).isTrue();

        waitForRestoreRestart();
        assertThat(getConfig().getSearching().getUserAgent()).contains(backupMarker);
        assertThat(historyQueries()).contains(preBackupQuery).doesNotContain(postBackupQuery);
    }

    @Test
    public void shouldRejectCorruptBackup() {
        String originalMarker = getConfig().getSearching().getUserAgent().orElse(null);
        HydraResponse response = hydraClient.postMultipartFile("/internalapi/backup/restorefile",
                "not a zip archive".getBytes(StandardCharsets.UTF_8), "corrupt.zip", "application/zip", "file");
        GenericResponse result = response.as(GenericResponse.class);

        assertThat(response.status()).isEqualTo(200);
        assertThat(result.isSuccessful()).isFalse();
        waitUntilHealthy();
        assertThat(getConfig().getSearching().getUserAgent()).isEqualTo(Optional.ofNullable(originalMarker));
    }

    @Test
    public void shouldRejectBackupWithPathTraversalEntry() throws Exception {
        String markerName = "backup-restore-traversal-marker-" + UUID.randomUUID();
        Path markerPath = dataFolder.resolve(markerName);
        try {
            assertThat(Files.exists(markerPath)).isFalse();
            byte[] archive = zipWithEntry("../" + markerName, "must not be written".getBytes(StandardCharsets.UTF_8));

            HydraResponse response = hydraClient.postMultipartFile("/internalapi/backup/restorefile", archive,
                    "traversal.zip", "application/zip", "file");
            GenericResponse result = response.as(GenericResponse.class);

            assertThat(response.status()).isEqualTo(200);
            assertThat(result.isSuccessful()).isFalse();
            waitUntilHealthy();
            assertThat(Files.exists(markerPath)).isFalse();
        } finally {
            Files.deleteIfExists(markerPath);
        }
    }

    @Test
    public void shouldPreserveLastValidBackupAfterRestoreFailure() throws Exception {
        BackupEntry backup = createBackupAndFindNew();
        byte[] originalBackup = hydraClient.get("/internalapi/backup/download", "filename=" + backup.getFilename()).bodyBytes();
        assertThat(isZip(originalBackup)).isTrue();

        HydraResponse response = hydraClient.postMultipartFile("/internalapi/backup/restorefile",
                "definitely not a zip".getBytes(StandardCharsets.UTF_8), "corrupt.zip", "application/zip", "file");
        GenericResponse result = response.as(GenericResponse.class);

        assertThat(response.status()).isEqualTo(200);
        assertThat(result.isSuccessful()).isFalse();
        waitUntilHealthy();
        assertThat(backups()).extracting(BackupEntry::getFilename).contains(backup.getFilename());
        byte[] downloadedBackup = hydraClient.get("/internalapi/backup/download", "filename=" + backup.getFilename()).bodyBytes();
        assertThat(downloadedBackup).isEqualTo(originalBackup);
        assertThat(isZip(downloadedBackup)).isTrue();
    }

    private BackupEntry createBackupAndFindNew() throws InterruptedException {
        Set<String> before = backups().stream().map(BackupEntry::getFilename).collect(java.util.stream.Collectors.toSet());
        Thread.sleep(1100); // Backup names have second resolution; avoid replacing an existing file.
        HydraResponse response = hydraClient.get("/internalapi/backup/backuponly");
        GenericResponse result = response.as(GenericResponse.class);
        assertThat(response.status()).isEqualTo(200);
        assertThat(result.isSuccessful()).isTrue();
        Awaitility.await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(backups()).extracting(BackupEntry::getFilename).anySatisfy(filename -> assertThat(before).doesNotContain(filename)));
        return backups().stream().filter(entry -> !before.contains(entry.getFilename())).findFirst().orElseThrow();
    }

    private void createAndWaitForHistory(String query) throws Exception {
        searcher.searchExternalApi(query);
        Awaitility.await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> assertThat(historyQueries()).contains(query));
    }

    private List<String> historyQueries() {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("time", 0));
        HydraPage<SearchEntityTO> page = hydraClient.post("/internalapi/history/searches", request).as(new TypeReference<>() {
        });
        return page.getContent().stream().map(SearchEntityTO::getQuery).toList();
    }

    private List<BackupEntry> backups() {
        return hydraClient.get("/internalapi/backup/list").as(new TypeReference<>() {
        });
    }

    private BaseConfig getConfig() {
        HydraResponse response = hydraClient.get("/internalapi/config");
        assertThat(response.status()).isEqualTo(200);
        return response.as(BaseConfig.class);
    }

    private void assertSuccessfulSave(BaseConfig config) {
        HydraResponse response = hydraClient.put("/internalapi/config", config);
        ConfigValidationResult validationResult = response.as(ConfigValidationResult.class);
        assertThat(response.status()).isEqualTo(200);
        assertThat(validationResult.isOk()).isTrue();
        assertThat(validationResult.getErrorMessages()).isEmpty();
        assertThat(validationResult.getNewConfig()).isNotNull();
    }

    private void waitUntilHealthy() {
        Awaitility.await().atMost(Duration.ofSeconds(90)).ignoreExceptions().untilAsserted(() ->
                assertThat(hydraClient.get("/actuator/health/ping").status()).isEqualTo(200));
    }

    private void waitForRestoreRestart() {
        AtomicBoolean becameUnavailable = new AtomicBoolean();
        Awaitility.await().atMost(Duration.ofSeconds(90)).until(() -> {
            try {
                boolean healthy = hydraClient.get("/actuator/health/ping").status() == 200;
                return becameUnavailable.get() && healthy;
            } catch (RuntimeException e) {
                becameUnavailable.set(true);
                return false;
            }
        });
    }

    private static byte[] zipWithEntry(String name, byte[] contents) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry(name));
            zip.write(contents);
            zip.closeEntry();
        }
        return bytes.toByteArray();
    }

    private static boolean isZip(byte[] bytes) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            return zip.getNextEntry() != null;
        }
    }
}
