package org.nzbhydra.backup;

import com.google.common.base.Stopwatch;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.io.FileUtils;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.logging.LoggingMarkers;
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
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class BackupAndRestore {

    private static final Logger logger = LoggerFactory.getLogger(BackupAndRestore.class);
    private static final Pattern FILE_PATTERN = Pattern.compile("nzbhydra-(\\d{4}-\\d{2}-\\d{2} \\d{2}-\\d{2}-\\d{2})\\.zip");
    private static final DateTimeFormatter DATE_PATTERN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss");

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UpdateManager updateManager;
    private ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    @Transactional
    public File backup() throws Exception {
        Stopwatch stopwatch = Stopwatch.createStarted();
        File backupFolder = getBackupFolder();
        if (!backupFolder.exists()) {
            boolean created = backupFolder.mkdirs();
            if (!created) {
                throw new IOException("Unable to create backup target folder " + backupFolder.getAbsolutePath());
            }
        }

        deleteOldBackupFiles(backupFolder);

        logger.info("Creating backup");

        File backupZip = new File(backupFolder, "nzbhydra-" + LocalDateTime.now().format(DATE_PATTERN) + ".zip");
        backupDatabase(backupZip);
        Map<String, String> env = new HashMap<>();
        env.put("create", "true");
        URI uri = URI.create("jar:" + backupZip.toPath().toUri());
        try (FileSystem fs = FileSystems.newFileSystem(uri, env)) {
            Path nf = fs.getPath("nzbhydra.yml");
            try (Writer writer = java.nio.file.Files.newBufferedWriter(nf, StandardCharsets.UTF_8, StandardOpenOption.CREATE)) {
                writer.write(configReaderWriter.getAsYamlString(configProvider.getBaseConfig()));
                logger.debug("Successfully wrote config to backup ZIP");
            }
        }

        logger.info("Successfully wrote backup to file {}", backupZip.getAbsolutePath());
        logger.debug(LoggingMarkers.PERFORMANCE, "Creation of backup took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return backupZip;
    }

    protected void deleteOldBackupFiles(File backupFolder) {
        if (configProvider.getBaseConfig().getMain().getDeleteBackupsAfterWeeks().isPresent()) {
            logger.info("Deleting old backups if any exist");
            Integer backupMaxAgeInWeeks = configProvider.getBaseConfig().getMain().getDeleteBackupsAfterWeeks().get();
            File[] zips = backupFolder.listFiles((dir, name) -> name != null && name.startsWith("nzbhydra") && name.endsWith(".zip"));

            if (zips != null) {
                for (File zip : zips) {
                    Matcher matcher = FILE_PATTERN.matcher(zip.getName());
                    if (!matcher.matches()) {
                        logger.warn("Backup ZIP file name {} does not match expected pattern", zip.getName());
                        continue;
                    }
                    LocalDateTime backupDate = LocalDateTime.from(DATE_PATTERN.parse(matcher.group(1)));
                    if (backupDate.isBefore(LocalDateTime.now().minusSeconds(60 * 60 * 24 * 7 * backupMaxAgeInWeeks))) {
                        logger.info("Deleting backup file {} because it's older than {} weeks", zip, backupMaxAgeInWeeks);
                        boolean deleted = zip.delete();
                        if (!deleted) {
                            logger.warn("Unable to delete old backup file {}", zip.getName());
                        }
                    }
                }
            }
        }
    }

    protected File getBackupFolder() {
        return new File(configProvider.getBaseConfig().getMain().getBackupFolder());
    }

    public List<BackupEntry> getExistingBackups() {
        List<BackupEntry> entries = new ArrayList<>();
        File backupFolder = getBackupFolder();
        if (backupFolder == null || !backupFolder.exists() || backupFolder.listFiles() == null) {
            return Collections.emptyList();
        }
        for (File file : backupFolder.listFiles((dir, name) -> name != null && name.startsWith("nzbhydra") && name.endsWith(".zip"))) {
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
            File tempFile = File.createTempFile("nzbhydra-restore", ".zip");
            FileUtils.copyInputStreamToFile(inputStream, tempFile);
            restoreFromFile(tempFile);
            tempFile.deleteOnExit();
            return GenericResponse.ok();
        } catch (Exception e) {
            logger.error("Error while restoring", e);
            return GenericResponse.notOk("Error while restoring: " + e.getMessage());
        }
    }

    private static void extractZip(File zipFile, File targetFolder) throws IOException {
        logger.info("Extracting from file {} to folder {}", zipFile.getCanonicalPath(), targetFolder.getCanonicalPath());
        Path dest = targetFolder.toPath().toAbsolutePath().normalize();

        Map<String, String> env = new HashMap<>();
        try (FileSystem zipFileSystem = FileSystems.newFileSystem(URI.create("jar:" + zipFile.toPath().toUri()), env)) {
            Path root = zipFileSystem.getPath("/");
            Files.walkFileTree(root, new ExtractZipFileVisitor(dest));
        }
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BackupEntry {
        private String filename;
        private Instant creationDate;
    }

}
