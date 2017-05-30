package org.nzbhydra.backup;

import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.io.File;
import java.io.IOException;
import java.io.Writer;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Component
public class BackupAndRestore {

    private static final Logger logger = LoggerFactory.getLogger(BackupAndRestore.class);

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private ConfigProvider configProvider;

    private static final long DAY = 1000 * 60 * 60 * 24;

    //TODO Make sure we only make a backup once. Perhaps save in database when the last one was executed. Or check backup.zip files for date
    //@Scheduled(fixedDelay = DAY)
    @Transactional
    public void createBackup() {
        if (LocalDateTime.now().getDayOfWeek() == DayOfWeek.SUNDAY) {
            try {
                backup();
            } catch (Exception e) {
                logger.error("An error occured while doing a background backup", e);
            }
        }
    }


    public File backup() throws Exception {
        logger.info("Creating backup");

        File mainFolder = new File(""); //TODO make sure we're in the correct main folder
        File backupFolder = new File(mainFolder, "backup");
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
        Path path = backupZip.toPath();
        URI uri = URI.create("jar:" + path.toUri());
        try (FileSystem fs = FileSystems.newFileSystem(uri, env)) {
            Path nf = fs.getPath("application.yml");
            try (Writer writer = java.nio.file.Files.newBufferedWriter(nf, StandardCharsets.UTF_8, StandardOpenOption.CREATE)) {
                writer.write(configProvider.getBaseConfig().getAsYamlString());
            }
        }

        logger.info("Successfully wrote backup to file {}", backupZip.getAbsolutePath());
        return backupZip;

    }


    private void backupDatabase(File targetFile) {
        logger.info("Backing up database");
        String formattedFilepath = targetFile.getAbsolutePath().replace("\\", "/");
        entityManager.createNativeQuery("BACKUP TO '" + formattedFilepath + "';").executeUpdate();
        logger.info("Wrote database backup files to {}", targetFile.getAbsolutePath());
    }

}
