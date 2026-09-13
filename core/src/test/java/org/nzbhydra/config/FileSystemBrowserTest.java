package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.FileSystemBrowser.FileSystemEntry;

import javax.swing.filechooser.FileSystemView;
import java.io.File;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the AWT-less path through {@link FileSystemEntry#isTraversable(File, Supplier)}.
 *
 * <p>The folder picker's backend reaches {@link FileSystemView}, which reaches AWT. The native-image container has no
 * {@code libawt}, so the first call after a start throws {@link UnsatisfiedLinkError} from {@code Toolkit}'s static
 * initializer, and every later call throws {@link NoClassDefFoundError} because the failed initializer leaves the
 * class erroneous. Catching only the second -- which is what shipped -- made exactly one folder listing per start
 * answer HTTP 500 while every retry passed, so it presented as a flaky test rather than a defect.
 */
class FileSystemBrowserTest {

    private static final File ANY_DIRECTORY = new File(System.getProperty("user.dir"));

    @Test
    void shouldTreatDirectoryAsTraversableWhenAwtIsMissingEntirely() {
        final Supplier<FileSystemView> noLibawt = () -> {
            throw new UnsatisfiedLinkError("Can't load library: awt");
        };

        assertThat(FileSystemEntry.isTraversable(ANY_DIRECTORY, noLibawt)).isTrue();
    }

    @Test
    void shouldTreatDirectoryAsTraversableWhenAwtInitializationAlreadyFailed() {
        final Supplier<FileSystemView> poisonedToolkit = () -> {
            throw new NoClassDefFoundError("Could not initialize class java.awt.Toolkit");
        };

        assertThat(FileSystemEntry.isTraversable(ANY_DIRECTORY, poisonedToolkit)).isTrue();
    }

    @Test
    void shouldReportWhatTheFileSystemViewSaysWhenAwtIsAvailable() {
        assertThat(FileSystemEntry.isTraversable(ANY_DIRECTORY, FakeFileSystemView::new)).isFalse();
    }

    /** Answers {@code false} for everything, so a swallowed exception cannot be mistaken for a real answer. */
    private static class FakeFileSystemView extends FileSystemView {
        @Override
        public Boolean isTraversable(File file) {
            return false;
        }

        @Override
        public File createNewFolder(File containingDir) {
            throw new UnsupportedOperationException();
        }
    }
}
