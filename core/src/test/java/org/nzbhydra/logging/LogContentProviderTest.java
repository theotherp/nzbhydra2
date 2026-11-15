package org.nzbhydra.logging;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.nzbhydra.NzbHydra;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class LogContentProviderTest {

    @TempDir
    Path dataFolder;

    private Path logsFolder;
    private String dataFolderBefore;
    private final LogContentProvider testee = new LogContentProvider();

    @BeforeEach
    void setUp() throws IOException {
        dataFolderBefore = NzbHydra.getDataFolder();
        NzbHydra.setDataFolder(dataFolder.toString());
        logsFolder = Files.createDirectories(dataFolder.resolve("logs"));
    }

    @AfterEach
    void tearDown() {
        NzbHydra.setDataFolder(dataFolderBefore);
    }

    @Test
    void shouldReturnNewestJsonLinesFirst() throws IOException {
        writeJsonLog(5);

        LogContentProvider.JsonLogResponse response = testee.getLogsAsJsonLines(0, 3);

        assertThat(messages(response)).containsExactly("message 5", "message 4", "message 3");
        assertThat(response.isHasMore()).isTrue();
        assertThat(response.getOffset()).isZero();
        assertThat(response.getLineCount()).isEqualTo(3);
    }

    @Test
    void shouldPageThroughJsonLinesWithoutGapsOrDuplicates() throws IOException {
        writeJsonLog(10);

        List<String> all = new ArrayList<>();
        int offset = 0;
        LogContentProvider.JsonLogResponse response;
        do {
            response = testee.getLogsAsJsonLines(offset, 3);
            all.addAll(messages(response));
            offset += response.getLineCount();
        } while (response.isHasMore());

        assertThat(all).containsExactlyElementsOf(IntStream.iterate(10, i -> i >= 1, i -> i - 1).mapToObj(i -> "message " + i).toList());
    }

    @Test
    void shouldReportNoMoreLinesWhenLimitMatchesRemainingLines() throws IOException {
        writeJsonLog(4);

        LogContentProvider.JsonLogResponse response = testee.getLogsAsJsonLines(2, 2);

        assertThat(messages(response)).containsExactly("message 2", "message 1");
        assertThat(response.isHasMore()).isFalse();
    }

    @Test
    void shouldReturnNothingWhenOffsetIsBehindLastLine() throws IOException {
        writeJsonLog(3);

        LogContentProvider.JsonLogResponse response = testee.getLogsAsJsonLines(3, 5);

        assertThat(response.getLines()).isEmpty();
        assertThat(response.isHasMore()).isFalse();
        assertThat(response.getOffset()).isEqualTo(3);
    }

    @Test
    void shouldReturnNothingForEmptyJsonLog() throws IOException {
        Files.writeString(logsFolder.resolve("nzbhydra2-log.json"), "");

        assertThat(testee.getLogsAsJsonLines(0, 5).getLines()).isEmpty();
        assertThat(testee.getLogsAsJsonLines(2, 5).getLines()).isEmpty();
    }

    @Test
    void shouldReadPlainLogAndItsSize() throws IOException {
        Files.writeString(logsFolder.resolve("nzbhydra2.log"), "line 1\nline 2\n", Charset.defaultCharset());

        assertThat(testee.getLog()).isEqualTo("line 1\nline 2\n");
        assertThat(testee.getLogFileSize()).isEqualTo(14);
    }

    @Test
    void shouldListLogFilesNewestFirst() throws IOException {
        createFile("nzbhydra2.log", 3);
        createFile("nzbhydra2.2026-11-01.log", 1);
        createFile("nzbhydra2-log.json", 4);
        createFile("nzbhydra2.2026-11-02.log", 2);

        assertThat(testee.getLogFileNames()).containsExactly("nzbhydra2.log", "nzbhydra2.2026-11-02.log", "nzbhydra2.2026-11-01.log");
    }

    @Test
    void shouldListNoLogFilesWithoutLogsFolder() throws IOException {
        Files.delete(logsFolder);

        assertThat(testee.getLogFileNames()).isEmpty();
    }

    private void writeJsonLog(int lines) throws IOException {
        StringBuilder content = new StringBuilder();
        for (int i = 1; i <= lines; i++) {
            content.append("{\"message\":\"message ").append(i).append("\",\"level\":\"INFO\"}\n");
        }
        Files.writeString(logsFolder.resolve("nzbhydra2-log.json"), content.toString(), Charset.defaultCharset());
    }

    private void createFile(String name, int minutesAfterEpoch) throws IOException {
        Path file = Files.writeString(logsFolder.resolve(name), name);
        Files.setLastModifiedTime(file, FileTime.from(Instant.ofEpochSecond(minutesAfterEpoch * 60L)));
    }

    private static List<String> messages(LogContentProvider.JsonLogResponse response) {
        return response.getLines().stream().map(x -> (String) x.get("message")).toList();
    }
}
