package org.nzbhydra.logging;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReversedLinesFileReaderTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldReturnNullForEmptyFile() throws IOException {
        assertThat(readAll("", 16, StandardCharsets.UTF_8)).isEmpty();
    }

    @Test
    void shouldReadSingleLineWithoutNewline() throws IOException {
        assertThat(readAll("only", 16, StandardCharsets.UTF_8)).containsExactly("only");
    }

    @Test
    void shouldReadLinesBackwardsAndSkipTrailingNewline() throws IOException {
        assertThat(readAll("first\nsecond\nthird\n", 4096, StandardCharsets.UTF_8)).containsExactly("third", "second", "first");
    }

    @Test
    void shouldReadLastLineWithoutTrailingNewline() throws IOException {
        assertThat(readAll("first\nsecond\nthird", 4096, StandardCharsets.UTF_8)).containsExactly("third", "second", "first");
    }

    @Test
    void shouldHandleWindowsAndOldMacLineEndings() throws IOException {
        assertThat(readAll("first\r\nsecond\rthird\r\n", 4096, StandardCharsets.UTF_8)).containsExactly("third", "second", "first");
    }

    @Test
    void shouldKeepEmptyLinesInTheMiddle() throws IOException {
        assertThat(readAll("first\n\nthird\n", 4096, StandardCharsets.UTF_8)).containsExactly("third", "", "first");
    }

    @Test
    void shouldKeepEmptyLinesWhenFileHasNoTrailingNewline() throws IOException {
        //Only an empty last line caused by a trailing newline is skipped, like BufferedReader does
        assertThat(readAll("first\n\nthird", 4096, StandardCharsets.UTF_8)).containsExactly("third", "", "first");
    }

    @Test
    void shouldReadFileConsistingOfNewlineOnly() throws IOException {
        assertThat(readAll("\n", 16, StandardCharsets.UTF_8)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 4, 5, 7, 8, 16, 4096})
    void shouldReadSameLinesAsForwardReaderForAnyBlockSize(int blockSize) throws IOException {
        String content = "short\n" + "x".repeat(50) + "\n\nä€😀 multi byte\r\nlast line\n";

        assertThat(readAll(content, blockSize, StandardCharsets.UTF_8)).containsExactlyElementsOf(readForwardReversed(content));
    }

    @Test
    void shouldReadLinesLongerThanBlockSize() throws IOException {
        String longLine = "a".repeat(100);
        assertThat(readAll(longLine + "\n" + longLine + "b\n", 16, StandardCharsets.UTF_8)).containsExactly(longLine + "b", longLine);
    }

    @Test
    void shouldNotSplitCrLfAcrossBlockBoundary() throws IOException {
        //With a block size of 8 the \r is the last byte of the first block and the \n the first of the second
        String content = "1234567\r\n12345\n";
        assertThat(readAll(content, 8, StandardCharsets.UTF_8)).containsExactly("12345", "1234567");
    }

    @Test
    void shouldReadMultiByteCharactersAcrossBlockBoundary() throws IOException {
        //Each emoji is four bytes in UTF-8. With a block size of 5 nearly every character is split between two blocks
        String content = "😀😀😀\nä€ä€\n😀\n";
        for (int blockSize = 3; blockSize <= 12; blockSize++) {
            assertThat(readAll(content, blockSize, StandardCharsets.UTF_8)).as("Block size %d", blockSize).containsExactly("😀", "ä€ä€", "😀😀😀");
        }
    }

    @Test
    void shouldReadUtf16LittleEndian() throws IOException {
        String content = "first\r\nzweite Zeile ä\nthird\n";
        assertThat(readAll(content, 6, StandardCharsets.UTF_16LE)).containsExactly("third", "zweite Zeile ä", "first");
    }

    @Test
    void shouldReadSingleByteEncoding() throws IOException {
        String content = "first\nzweite Zeile ä\n";
        assertThat(readAll(content, 4, StandardCharsets.ISO_8859_1)).containsExactly("zweite Zeile ä", "first");
    }

    @Test
    void shouldRejectUtf16WithoutByteOrder() throws IOException {
        Path file = write("abc", StandardCharsets.UTF_8);
        assertThatThrownBy(() -> new ReversedLinesFileReader(file.toFile(), 16, StandardCharsets.UTF_16)).isInstanceOf(UnsupportedEncodingException.class);
    }

    @Test
    void shouldKeepReturningNullAfterFirstLine() throws IOException {
        Path file = write("a\nb\n", StandardCharsets.UTF_8);
        try (ReversedLinesFileReader reader = new ReversedLinesFileReader(file.toFile(), 16, StandardCharsets.UTF_8)) {
            assertThat(reader.readLine()).isEqualTo("b");
            assertThat(reader.readLine()).isEqualTo("a");
            assertThat(reader.readLine()).isNull();
            assertThat(reader.readLine()).isNull();
        }
    }

    private List<String> readAll(String content, int blockSize, Charset charset) throws IOException {
        Path file = write(content, charset);
        List<String> lines = new ArrayList<>();
        try (ReversedLinesFileReader reader = new ReversedLinesFileReader(file.toFile(), blockSize, charset)) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
                if (lines.size() > 1000) {
                    throw new AssertionError("Reader didn't end");
                }
            }
        }
        return lines;
    }

    private Path write(String content, Charset charset) throws IOException {
        Path file = Files.createTempFile(tempDir, "log", ".txt");
        Files.write(file, content.getBytes(charset));
        return file;
    }

    private static List<String> readForwardReversed(String content) {
        List<String> lines = new ArrayList<>(content.lines().toList());
        Collections.reverse(lines);
        return lines;
    }
}
