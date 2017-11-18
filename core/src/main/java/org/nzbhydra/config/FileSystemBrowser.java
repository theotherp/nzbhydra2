package org.nzbhydra.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;

import javax.swing.filechooser.FileSystemView;
import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class FileSystemBrowser {

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
    @AllArgsConstructor
    public static class DirectoryListingRequest {
        private String fullPath;
        private String type;
        private boolean goUp;
    }

    @Data
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
                    this.folders = Stream.of(files).filter(file -> file.isDirectory() && FileSystemView.getFileSystemView().isTraversable(file)).map(FileSystemSubEntry::new).collect(Collectors.toList());
                    if (!type.equals("folder")) {
                        this.files = Stream.of(files).filter(File::isFile).map(FileSystemSubEntry::new).collect(Collectors.toList());
                    }
                }
            }
        }

        public static FileSystemEntry getRoots() {
            FileSystemEntry entry = new FileSystemEntry();
            entry.folders = Stream.of(File.listRoots()).filter(x -> FileSystemView.getFileSystemView().isTraversable(x)).map(x -> new FileSystemSubEntry(x.getPath(), x.getPath())).collect(Collectors.toList());
            entry.hasParent = false;
            return entry;
        }
    }

    @Data
    @AllArgsConstructor
    public static class FileSystemSubEntry {
        private String name;
        private String fullPath;

        public FileSystemSubEntry(File file) {
            name = file.getName().equals("") ? file.getPath() : file.getName(); //Roots don't contain a name
            fullPath = file.getAbsolutePath();
        }
    }


}
