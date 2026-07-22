package org.nzbhydra.backup;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.FileVisitor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;

/**
 * @author hms
 */
public class ExtractZipFileVisitor implements FileVisitor<Path> {
    private Path destRoot;

    public ExtractZipFileVisitor(Path destRoot) {
        this.destRoot = destRoot;
    }

    @Override
    public FileVisitResult preVisitDirectory(Path zipDir, BasicFileAttributes attrs) throws IOException {
        // zipDir = unix-pfad
        Path destDir = Path.of(destRoot.toString(), zipDir.toString());  // windowspfad
        Files.createDirectories(destDir);
        return FileVisitResult.CONTINUE;
    }

    @Override
    public FileVisitResult visitFile(Path zipFile, BasicFileAttributes attrs) throws IOException {
        // zipFile = unix-pfad
        Path dest = Path.of(destRoot.toString(), zipFile.toString());  // windowspfad
        Files.copy(zipFile, dest, StandardCopyOption.REPLACE_EXISTING);
        return FileVisitResult.CONTINUE;
    }

    @Override
    public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
        return FileVisitResult.CONTINUE;
    }

    @Override
    public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
        return FileVisitResult.CONTINUE;
    }
}