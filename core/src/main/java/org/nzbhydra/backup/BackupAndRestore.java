package org.nzbhydra.backup;

import com.google.common.io.Files;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class BackupAndRestore {

    private static final Logger logger = LoggerFactory.getLogger(BackupAndRestore.class);

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private ConfigProvider configProvider;


    public File backup() throws Exception {
        File configBackupFile = null;
        File tempFile = null;
        File tempFolder = null;
        try {
            File mainFolder = new File(getClass().getProtectionDomain().getCodeSource().getLocation().toURI());
            tempFolder = Files.createTempDir();
            File backupFolder = new File(mainFolder, "backup");
            if (!backupFolder.exists()) {
                boolean created = backupFolder.mkdirs();
                if (!created) {
                    throw new IOException("Unable to create backup target folder " + backupFolder.getAbsolutePath());
                }
            }
            backupDatabase(tempFolder);

            configBackupFile = new File(tempFolder, "application.yml");
            configProvider.getBaseConfig().save(configBackupFile);

            tempFile = File.createTempFile("nzbhydra", ".zip");
            logger.debug("Using temp file {}", tempFile.getAbsolutePath());
            FileOutputStream fos = new FileOutputStream(tempFile);
            ZipOutputStream zos = new ZipOutputStream(fos);

            for (File file : tempFolder.listFiles()) {
                addToZipFile(file, zos);
                file.delete();
            }

            zos.close();
            fos.close();

            File backupZip = new File(backupFolder, "nzbhydra-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss")) + ".zip");
            logger.debug("Moving temporary ZIP to {}", backupZip.getAbsolutePath());
            Files.move(tempFile, backupZip);
            return backupZip;
        } finally {
            try {
                if (tempFile != null) {
                    tempFile.delete();
                }
                if (tempFolder != null) {
                    tempFolder.delete();
                }
            } catch (Exception e) {
                logger.warn("Error while deleting temporary file/folder: " + e.getMessage());
            }
        }

    }

    private static void addToZipFile(File file, ZipOutputStream zos) throws IOException {
        logger.debug("Adding file {} to temporary ZIP file", file.getAbsolutePath());
        FileInputStream fis = new FileInputStream(file);
        ZipEntry zipEntry = new ZipEntry(file.getName());
        zos.putNextEntry(zipEntry);

        byte[] bytes = new byte[1024];
        int length;
        while ((length = fis.read(bytes)) >= 0) {
            zos.write(bytes, 0, length);
        }

        zos.closeEntry();
        fis.close();
    }

    private void backupDatabase(File targetFolder) {
        String formattedFolder = targetFolder.getAbsolutePath().replace("\\", "/");
        if (!formattedFolder.endsWith("/")) {
            formattedFolder += "/";
        }
        entityManager.createNativeQuery("BACKUP DATABASE TO '" + formattedFolder + "' BLOCKING as files;").executeUpdate();
        logger.info("Wrote database backup files to {}", targetFolder.getAbsolutePath());
    }

}
