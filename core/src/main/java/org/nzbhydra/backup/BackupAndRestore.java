package org.nzbhydra.backup;

import com.google.common.base.Stopwatch;
import com.google.common.base.Throwables;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.apache.commons.io.FileUtils;
import org.h2.message.DbException;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.misc.TempFileProvider;
import org.nzbhydra.systemcontrol.SystemControl;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aot.hint.annotation.Reflective;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Writer;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.spi.FileSystemProvider;
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

@SuppressWarnings("ResultOfMethodCallIgnored")
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
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Autowired
    private SystemControl systemControl;
    @Autowired
    private TempFileProvider tempFileProvider;

    @Autowired
    private GenericStorage genericStorage;
    private final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

    @PostConstruct
    public void init() {
        //Try to load FileSystem providers. This *may* help prevent the error "Circular loading of installed providers detected" when running FileSystems.newFileSystem(uri, env) below
        try {
            FileSystemProvider.installedProviders();
        } catch (Exception e) {
            logger.error("Unable to load installed FileSystemProviders");
        }
    }

    @Transactional
    public File backup(boolean triggeredByUsed) throws Exception {
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
        backupDatabase(backupZip, triggeredByUsed);
        if (!backupZip.exists()) {
            throw new RuntimeException("Export to file " + backupZip + " was not executed by database");
        }
        Map<String, String> env = new HashMap<>();
        env.put("create", "true");
        //We use the jar filesystem so we can add files to the existing ZIP
        URI uri = URI.create("jar:" + backupZip.toPath().toUri());
        try (FileSystem fs = FileSystems.newFileSystem(uri, env)) {
            Path nf = fs.getPath("nzbhydra.yml");
            try (Writer writer = java.nio.file.Files.newBufferedWriter(nf, StandardCharsets.UTF_8, StandardOpenOption.CREATE)) {
                writer.write(configReaderWriter.getAsYamlString(configProvider.getBaseConfig()));
                logger.debug("Successfully wrote config to backup ZIP");
                backupCertificates(fs);
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
                Map<File, LocalDateTime> fileToBackupTime = new HashMap<>();
                for (File zip : zips) {
                    Matcher matcher = FILE_PATTERN.matcher(zip.getName());
                    if (!matcher.matches()) {
                        logger.warn("Backup ZIP file name {} does not match expected pattern", zip.getName());
                        continue;
                    }
                    LocalDateTime backupDate = LocalDateTime.from(DATE_PATTERN.parse(matcher.group(1)));
                    fileToBackupTime.put(zip, backupDate);
                }
                for (File zip : zips) {
                    if (!fileToBackupTime.containsKey(zip)) {
                        continue;
                    }
                    LocalDateTime backupDate = fileToBackupTime.get(zip);
                    if (backupDate.isBefore(LocalDateTime.now().minusSeconds(60L * 60 * 24 * 7 * backupMaxAgeInWeeks))) {
                        final boolean successfulNewerBackup = fileToBackupTime.entrySet().stream().anyMatch(x -> x.getKey() != zip && x.getValue().isAfter(backupDate));
                        if (!successfulNewerBackup) {
                            logger.warn("No successful backup was made after the creation of {}. Will not delete it.", zip.getAbsolutePath());
                            continue;
                        }
                        logger.info("Deleting backup file {} because it's older than {} weeks and a newer successful backup exists", zip, backupMaxAgeInWeeks);
                        boolean deleted = zip.delete();
                        if (!deleted) {
                            logger.warn("Unable to delete old backup file {}", zip.getName());
                        }
                    }
                }
            }
        }
    }

    @Reflective
    protected File getBackupFolder() {
        final String backupFolder = configProvider.getBaseConfig().getMain().getBackupFolder();
        if (backupFolder.contains(File.separator)) {
            return new File(backupFolder);
        }
        return new File(NzbHydra.getDataFolder(), backupFolder);
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
                logger.error("Unable to read creation date of file {}", file, e);
            }
        }
        entries.sort((o1, o2) -> o2.getCreationDate().compareTo(o1.getCreationDate()));
        return entries;
    }


    private void backupDatabase(File targetFile, boolean triggeredByUsed) {
        final String tempPath;

        File tempFile;
        try {
            tempFile = tempFileProvider.getTempFile("databaseTest", ".zip");
            tempPath = tempFile.getAbsolutePath().replace("\\", "/");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        try {
            String formattedFilepath = targetFile.getAbsolutePath().replace("\\", "/");
            logger.info("Backing up database to {}", formattedFilepath);
            //Write a script to ensure that the backed up database is actually valid
            final Query nativeQuery = entityManager.createNativeQuery("SCRIPT TO '%s';".formatted(tempPath));
            //If the database is corrupted this command will back it up without exception
            entityManager.createNativeQuery("BACKUP TO '" + formattedFilepath + "';").executeUpdate();
            final List resultList = nativeQuery.getResultList();
            logger.debug("Wrote database backup data to {}", targetFile.getAbsolutePath());
        } catch (Exception e) {
            logger.info("Deleting invalid backup file {}", targetFile);
            targetFile.delete();
            tempFile.delete();
            if (!triggeredByUsed) {
                final String dbExceptionMessage = Throwables.getCausalChain(e).stream().filter(x -> x instanceof DbException).findFirst().map(Throwable::getMessage).orElse(null);
                genericStorage.save("FAILED_BACKUP", new FailedBackupData(dbExceptionMessage));
            }
            throw e;
        } finally {
            tempFile.delete();
        }
    }

    private void backupCertificates(FileSystem fileSystem) throws IOException {
        final File certificatesFolder = new File(NzbHydra.getDataFolder(), "certificates");
        if (!certificatesFolder.exists()) {
            return;
        }
        logger.info("Backing up certificates folder");
        Files.createDirectory(fileSystem.getPath("certificates"));
        for (File file : certificatesFolder.listFiles()) {
            try (final OutputStream outputStream = Files.newOutputStream(fileSystem.getPath("certificates", file.getName()), StandardOpenOption.CREATE)) {
                Files.copy(file.toPath(), outputStream);
                logger.debug("Successfully wrote file {} to backup ZIP", file.getName());
            }
        }
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

    public GenericResponse restoreFromFile(InputStream inputStream) {
        try {
            File tempFile = tempFileProvider.getTempFile("restore", ".zip");
            FileUtils.copyInputStreamToFile(inputStream, tempFile);
            tempFile.deleteOnExit();
            restoreFromFile(tempFile);
            return GenericResponse.ok();
        } catch (Exception e) {
            logger.error("Error while restoring", e);
            return GenericResponse.notOk("Error while restoring: " + e.getMessage());
        }
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
        systemControl.exitWithReturnCode(SystemControl.RESTORE_RETURN_CODE);
    }

    private static void extractZip(File zipFile, File targetFolder) throws IOException {
        logger.info("Extracting from file {} to folder {}", zipFile.getCanonicalPath(), targetFolder.getCanonicalPath());
        Path dest = targetFolder.toPath().toAbsolutePath().normalize();
        targetFolder.mkdir();

        Map<String, String> env = new HashMap<>();
        try (FileSystem zipFileSystem = FileSystems.newFileSystem(URI.create("jar:" + zipFile.toPath().toUri()), env)) {
            Path root = zipFileSystem.getPath("/");
            Files.walkFileTree(root, new ExtractZipFileVisitor(dest));
        }
        try {
            restoreCertificates(targetFolder);
        } catch (IOException e) {
            logger.error("Unable to restore certificates", e);
        }
    }

    private static void restoreCertificates(File targetFolder) throws IOException {
        //Certificates aren't (yet) restored by the wrapper, so we copy them here. They're not locked by the main process anyway
        final File certificatesBackupFolder = new File(targetFolder, "certificates");
        if (certificatesBackupFolder.exists()) {
            final File certificatesFolder = new File(NzbHydra.getDataFolder(), "certificates");
            if (!certificatesFolder.exists()) {
                final boolean created = certificatesFolder.mkdir();
                if (!created) {
                    logger.error("Unable to create folder {}", certificatesFolder);
                    return;
                }
            }
            for (File file : certificatesBackupFolder.listFiles()) {
                Files.move(file.toPath(), new File(certificatesFolder, file.getName()).toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            }
        }
    }


}
