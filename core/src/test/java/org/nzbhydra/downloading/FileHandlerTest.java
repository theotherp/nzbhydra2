package org.nzbhydra.downloading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.misc.TempFileProvider;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.context.ApplicationEventPublisher;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
class FileHandlerTest {

    @Mock
    private TempFileProvider tempFileProvider;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private FileDownloadRepository downloadRepository;
    @Mock
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private FileHandler testee;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() throws IOException {
        when(tempFileProvider.getTempFile(anyString(), anyString()))
                .thenAnswer(inv -> File.createTempFile("nzbhydra-test", inv.getArgument(1)));
        when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
    }

    @Test
    void shouldReturnErrorResultForNonStandardHttpStatusCode() throws Exception {
        SearchResultEntity searchResult = new SearchResultEntity(new IndexerEntity("indexerName"), Instant.now(), "title", "guid", "http://127.0.0.1/nzb", "details", DownloadType.NZB, Instant.now());
        FileHandler spy = spy(testee);
        doThrow(new DownloadException("http://127.0.0.1/nzb", 521, "Web server is down")).when(spy).downloadFile(any());

        DownloadResult result = spy.handleContentDownload(SearchSource.INTERNAL, searchResult);

        assertThat(result.isSuccessful()).isFalse();
        assertThat(result.getStatusCode().value()).isEqualTo(521);
    }

    @Test
    void shouldCreateZipWithUnicodeEntryNames() throws Exception {
        String unicodeTitle = "Star ⭐️.nzb";
        byte[] content = "<nzb>test content</nzb>".getBytes();

        File tempFile = File.createTempFile("nzbhydra-safe-", ".nzb");
        tempFile.deleteOnExit();
        java.nio.file.Files.write(tempFile.toPath(), content);

        Map<File, String> fileToTitle = new LinkedHashMap<>();
        fileToTitle.put(tempFile, unicodeTitle);

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(1);
            assertThat(zipFile.getEntry(unicodeTitle)).isNotNull();
        }

        zip.delete();
    }

    @Test
    void shouldCreateZipWithMultipleUnicodeEntryNames() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();
        String[] titles = {
                "Normal title.nzb",
                "Mélissandre .nzb",
                "Star ⭐️.nzb"
        };

        for (String title : titles) {
            File tempFile = File.createTempFile("nzbhydra-safe-", ".nzb");
            tempFile.deleteOnExit();
            java.nio.file.Files.write(tempFile.toPath(), "content".getBytes());
            fileToTitle.put(tempFile, title);
        }

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(3);
            for (String title : titles) {
                assertThat(zipFile.getEntry(title))
                        .as("ZIP should contain entry with original Unicode name: " + title)
                        .isNotNull();
            }
        }

        zip.delete();
    }

    @Test
    void shouldCreateZipWithUniqueEntryNamesForDuplicateTitles() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();

        for (int i = 0; i < 2; i++) {
            File tempFile = File.createTempFile("nzbhydra-safe-", ".nzb");
            tempFile.deleteOnExit();
            java.nio.file.Files.write(tempFile.toPath(), ("content" + i).getBytes());
            fileToTitle.put(tempFile, "Duplicate title.nzb");
        }

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(2);
            assertThat(zipFile.getEntry("Duplicate title.nzb")).isNotNull();
            assertThat(zipFile.getEntry("Duplicate title_1.nzb")).isNotNull();

            Enumeration<? extends ZipEntry> entries = zipFile.entries();
            assertThat(entries.nextElement().getName()).isEqualTo("Duplicate title.nzb");
            assertThat(entries.nextElement().getName()).isEqualTo("Duplicate title_1.nzb");
        }

        zip.delete();
    }

    @Test
    void shouldCreateZipWithUniqueEntryNamesForSanitizedTitleCollisions() throws Exception {
        Map<File, String> fileToTitle = new LinkedHashMap<>();

        File firstFile = File.createTempFile("nzbhydra-safe-", ".nzb");
        firstFile.deleteOnExit();
        java.nio.file.Files.write(firstFile.toPath(), "content1".getBytes());
        fileToTitle.put(firstFile, "A_B.nzb");

        File secondFile = File.createTempFile("nzbhydra-safe-", ".nzb");
        secondFile.deleteOnExit();
        java.nio.file.Files.write(secondFile.toPath(), "content2".getBytes());
        fileToTitle.put(secondFile, "A_B.nzb");

        File zip = testee.createZip(fileToTitle);

        assertThat(zip).exists();
        try (ZipFile zipFile = new ZipFile(zip)) {
            assertThat(zipFile.size()).isEqualTo(2);
            assertThat(zipFile.getEntry("A_B.nzb")).isNotNull();
            assertThat(zipFile.getEntry("A_B_1.nzb")).isNotNull();
        }

        zip.delete();
    }
}
