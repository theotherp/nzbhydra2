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
    private final Path destRoot;

    public ExtractZipFileVisitor(Path destRoot) {
        this.destRoot = destRoot.toAbsolutePath().normalize();
    }

    @Override
    public FileVisitResult preVisitDirectory(Path zipDir, BasicFileAttributes attrs) throws IOException {
        Path destDir = destinationFor(zipDir);
        Files.createDirectories(destDir);
        return FileVisitResult.CONTINUE;
    }

    @Override
    public FileVisitResult visitFile(Path zipFile, BasicFileAttributes attrs) throws IOException {
        Path dest = destinationFor(zipFile);
        Files.createDirectories(dest.getParent());
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

    Path destinationFor(Path zipPath) throws IOException {
        String entryName = zipPath.toString().replace('\\', '/');
        while (entryName.startsWith("/")) {
            entryName = entryName.substring(1);
        }
        Path destination = destRoot.resolve(entryName).normalize();
        if (!destination.startsWith(destRoot)) {
            throw new IOException("ZIP entry escapes restore directory: " + zipPath);
        }
        return destination;
    }
}
