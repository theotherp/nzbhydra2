package org.nzbhydra.backup;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class ExtractZipFileVisitorTest {

    @Test
    void shouldRejectPathTraversalForDirectoryAndFileEntries() {
        Path destination = Path.of("target", "extract-zip-test").toAbsolutePath();
        ExtractZipFileVisitor visitor = new ExtractZipFileVisitor(destination);

        assertThatThrownBy(() -> visitor.preVisitDirectory(Path.of("..", "directory-entry"), null))
                .isInstanceOf(IOException.class);
        assertThatThrownBy(() -> visitor.visitFile(Path.of("..", "file-entry.txt"), null))
                .isInstanceOf(IOException.class);
    }

    @Test
    void shouldResolveEntriesUnderDestination() throws Exception {
        Path destination = Path.of("target", "extract-zip-test").toAbsolutePath();
        ExtractZipFileVisitor visitor = new ExtractZipFileVisitor(destination);

        assertThat(visitor.destinationFor(Path.of("certificates", "certificate.pem")))
                .isEqualTo(destination.resolve("certificates").resolve("certificate.pem"));
        assertThat(visitor.destinationFor(Path.of("/").resolve("nzbhydra.yml")))
                .isEqualTo(destination.resolve("nzbhydra.yml"));
    }

}
