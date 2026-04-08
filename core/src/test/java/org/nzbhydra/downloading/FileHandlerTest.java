package org.nzbhydra.downloading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.misc.TempFileProvider;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
class FileHandlerTest {

    @Mock
    private TempFileProvider tempFileProvider;

    @InjectMocks
    private FileHandler testee;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() throws IOException {
        when(tempFileProvider.getTempFile(anyString(), anyString()))
                .thenAnswer(inv -> File.createTempFile("nzbhydra-test", inv.getArgument(1)));
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
}
