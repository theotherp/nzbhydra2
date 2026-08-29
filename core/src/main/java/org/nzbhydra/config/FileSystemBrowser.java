package org.nzbhydra.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.swing.filechooser.FileSystemView;
import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class FileSystemBrowser {

    private static final Logger logger = LoggerFactory.getLogger(FileSystemBrowser.class);

    public FileSystemEntry getDirectoryListing(DirectoryListingRequest request) {
        if (request.getFullPath() == null) {
            return new FileSystemEntry(new File(System.getProperty("user.dir")), request.getType());
        }
        File folderFile = new File(request.getFullPath());
        if (request.isGoUp()) {
            if (folderFile.getParentFile() == null) {
                return FileSystemEntry.getRoots();
            }
            folderFile = new File(request.getFullPath()).getParentFile();
        } else {
            if (!folderFile.isAbsolute()) {
                folderFile = new File("", request.getFullPath());
            }
            if (folderFile.isFile()) {
                folderFile = folderFile.getParentFile();
            }
            while (!folderFile.exists() && folderFile.getParentFile() != null) {
                folderFile = folderFile.getParentFile();
            }
        }

        return new FileSystemEntry(folderFile, request.getType());
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DirectoryListingRequest {
        private String fullPath;
        private String type;
        private boolean goUp;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FileSystemEntry {
        private String fullPath;
        private boolean hasParent;

        private List<FileSystemSubEntry> files = new ArrayList<>();
        private List<FileSystemSubEntry> folders = new ArrayList<>();

        public FileSystemEntry(File folderFile, String type) {
            this.fullPath = folderFile.getAbsolutePath();
            if (folderFile.isDirectory()) {
                if (folderFile.getParentFile() == null) {
                    hasParent = true;
                } else {
                    hasParent = !Arrays.asList(File.listRoots()).contains(folderFile);
                }
                File[] files = folderFile.listFiles();
                if (files != null) {
                    this.folders = Stream.of(files).filter(getFileFilterPredicate()).map(FileSystemSubEntry::new).collect(Collectors.toList());
                    if (!type.equals("folder")) {
                        this.files = Stream.of(files).filter(File::isFile).map(FileSystemSubEntry::new).collect(Collectors.toList());
                    }
                }
            }
        }

        protected Predicate<File> getFileFilterPredicate() {
            return file -> file.isDirectory() && isTraversable(file);
        }

        public static FileSystemEntry getRoots() {
            FileSystemEntry entry = new FileSystemEntry();
            entry.folders = Stream.of(File.listRoots()).filter(FileSystemEntry::isTraversable).map(x -> new FileSystemSubEntry(x.getPath(), x.getPath())).collect(Collectors.toList());
            entry.hasParent = false;
            return entry;
        }

        static boolean isTraversable(File file) {
            return isTraversable(file, FileSystemView::getFileSystemView);
        }

        /**
         * {@link FileSystemView#isTraversable(File)}, or {@code true} where the platform cannot answer.
         *
         * <p>The call reaches AWT, which a server does not necessarily have. The native-image container this ships in
         * carries no {@code libawt} at all, so the *first* call throws {@link UnsatisfiedLinkError} out of
         * {@code Toolkit}'s static initializer ("Can't load library: awt"). Every later call throws
         * {@link NoClassDefFoundError} instead, because a failed initializer leaves {@code Toolkit} permanently
         * erroneous.
         *
         * <p>That difference is the whole bug this guards. The previous version caught only {@code NoClassDefFoundError}
         * -- a sibling of {@code UnsatisfiedLinkError}, not a supertype -- so exactly one folder listing per start, the
         * first, answered HTTP 500, and every retry passed because by then the error had changed to the caught kind.
         * It read as a flaky test rather than as a defect. Both are {@link LinkageError}, so both are caught here.
         *
         * <p>Failing open is right: {@code isTraversable} exists to hide Windows shell pseudo-folders, so where the
         * question cannot be asked, a readable directory is traversable.
         */
        static boolean isTraversable(File file, Supplier<FileSystemView> fileSystemView) {
            try {
                return fileSystemView.get().isTraversable(file);
            } catch (LinkageError e) {
                return true;
            }
        }
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FileSystemSubEntry {
        private String name;
        private String fullPath;

        public FileSystemSubEntry(File file) {
            name = file.getName().equals("") ? file.getPath() : file.getName(); //Roots don't contain a name
            fullPath = file.getAbsolutePath();
        }
    }


}
