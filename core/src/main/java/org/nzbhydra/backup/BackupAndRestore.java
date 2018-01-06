package org.nzbhydra.backup;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.Writer;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class BackupAndRestore {

    private static final Logger logger = LoggerFactory.getLogger(BackupAndRestore.class);

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UpdateManager updateManager;

    @Transactional
    public File backup() throws Exception {
        logger.info("Creating backup");

        File backupFolder = getBackupFolder();
        if (!backupFolder.exists()) {
            boolean created = backupFolder.mkdirs();
            if (!created) {
                throw new IOException("Unable to create backup target folder " + backupFolder.getAbsolutePath());
            }
        }
        File backupZip = new File(backupFolder, "nzbhydra-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss")) + ".zip");
        backupDatabase(backupZip);
        Map<String, String> env = new HashMap<>();
        env.put("create", "true");
        URI uri = URI.create("jar:" + backupZip.toPath().toUri());
        try (FileSystem fs = FileSystems.newFileSystem(uri, env)) {
            Path nf = fs.getPath("nzbhydra.yml");
            try (Writer writer = java.nio.file.Files.newBufferedWriter(nf, StandardCharsets.UTF_8, StandardOpenOption.CREATE)) {
                writer.write(configProvider.getBaseConfig().getAsYamlString());
                logger.debug("Successfully wrote config to backup ZIP");
            }
        }

        logger.info("Successfully wrote backup to file {}", backupZip.getAbsolutePath());
        return backupZip;

    }

    protected File getBackupFolder() {
        return new File(NzbHydra.getDataFolder(), "backup");
    }

    public List<BackupEntry> getExistingBackups() {
        List<BackupEntry> entries = new ArrayList<>();
        File backupFolder = getBackupFolder();
        if (backupFolder == null || !backupFolder.exists() || backupFolder.listFiles() == null) {
            return Collections.emptyList();
        }
        for (File file : backupFolder.listFiles()) {
            try {
                entries.add(new BackupEntry(file.getName(), Files.readAttributes(file.toPath(), BasicFileAttributes.class).creationTime().toInstant()));
            } catch (IOException e) {
                logger.error("Unable to read creation date of file " + file, e);
            }
        }
        entries.sort((o1, o2) -> o2.getCreationDate().compareTo(o1.getCreationDate()));
        return entries;
    }


    private void backupDatabase(File targetFile) {
        String formattedFilepath = targetFile.getAbsolutePath().replace("\\", "/");
        logger.info("Backing up database to " + formattedFilepath);
        entityManager.createNativeQuery("BACKUP TO '" + formattedFilepath + "';").executeUpdate();
        logger.debug("Wrote database backup files to {}", targetFile.getAbsolutePath());
    }

    public GenericResponse restore(String filename) {
        try {
            File backupFile = new File(getBackupFolder(), filename);
            if (!backupFile.exists()) {
                return GenericResponse.notOk("File does not exist");
            }
            restoreFromFile(backupFile);
        } catch (Exception e) {
            logger.error("Error while restoring", e);
            return GenericResponse.notOk("Error while restoring: " + e.getMessage());
        }

        return GenericResponse.ok();
    }

    protected void restoreFromFile(File backupFile) throws IOException {
        File restoreFolder = new File(NzbHydra.getDataFolder(), "restore");
        if (restoreFolder.exists()) {
            FileUtils.cleanDirectory(restoreFolder);
            FileUtils.deleteDirectory(restoreFolder);
        } else {
            boolean created = restoreFolder.mkdirs();
            if (!created) {
                throw new IOException("Unable to create folder " + restoreFolder.getCanonicalPath());
            }
        }
        extractZip(backupFile, restoreFolder);
        logger.info("Successfully extracted backup file for wrapper. Restarting.");
        updateManager.exitWithReturnCode(UpdateManager.RESTORE_RETURN_CODE);
    }

    public GenericResponse restoreFromFile(InputStream inputStream) {
        try {
            File tempFile = File.createTempFile("nzbhydra-restore", "zip");
            FileUtils.copyInputStreamToFile(inputStream, tempFile);
            restoreFromFile(tempFile);
            tempFile.deleteOnExit();
            return GenericResponse.ok();
        } catch (IOException e) {
            logger.error("Error while restoring", e);
            return GenericResponse.notOk("Error while restoring: " + e.getMessage());
        }
    }

    private static void extractZip(File zipFile, File targetFolder) throws IOException {
        logger.info("Extracting from file {} to folder ", zipFile.getCanonicalPath(), targetFolder.getCanonicalPath());
        Path dest = targetFolder.toPath().toAbsolutePath().normalize();

        Map<String, String> env = new HashMap<>();
        try (FileSystem zipFileSystem = FileSystems.newFileSystem(URI.create("jar:" + zipFile.toPath().toUri()), env)) {
            Path root = zipFileSystem.getPath("/");
            Files.walkFileTree(root, new ExtractZipFileVisitor(dest));
        } catch (IOException ex) {
            throw ex;
        }
    }

    @Data
    @AllArgsConstructor
    public static class BackupEntry {
        private String filename;
        private Instant creationDate;
    }

}
