package org.nzbhydra.debuginfos;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.logging.LogAnonymizer;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class DebugInfosProvider {

    private static final Logger logger = LoggerFactory.getLogger(DebugInfosProvider.class);

    @Autowired
    private LogAnonymizer logAnonymizer;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UpdateManager updateManager;
    @PersistenceContext
    private EntityManager entityManager;

    public byte[] getDebugInfosAsZip() throws IOException {
        logger.info("Creating debug infos");
        logger.info("NZBHydra2 version: {}", updateManager.getCurrentVersionString());
        logger.info("Java command line: {}", System.getProperty("sun.java.command"));
        logger.info("Java runtime name: {}", System.getProperty("java.runtime.name"));
        logger.info("Java runtime version: {}", System.getProperty("java.runtime.version"));
        logger.info("OS name: {}", System.getProperty("os.name"));
        logger.info("OS architecture: {}", System.getProperty("os.arch"));
        logger.info("User country: {}", System.getProperty("user.country"));
        logger.info("File encoding: {}", System.getProperty("file.encoding"));
        logNumberOfTableRows("SEARCH");
        logNumberOfTableRows("SEARCHRESULT");
        logNumberOfTableRows("INDEXERSEARCH");
        logNumberOfTableRows("INDEXERAPIACCESS");
        logNumberOfTableRows("INDEXERAPIACCESS_SHORT");
        logNumberOfTableRows("INDEXERNZBDOWNLOAD");
        logDatabaseFolderSize();
        if (isRunInDocker()) {
            logger.info("Apparently run in docker");
        }

        String anonymizedConfig = getAnonymizedConfig();
        String anonymizedLog = logAnonymizer.getAnonymizedLog();
        File tempFile = File.createTempFile("nzbhydradebuginfos", "zip");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            try (ZipOutputStream zos = new ZipOutputStream(fos)) {
                writeStringToZip(zos, "nzbhy" +
                        "dra.log", anonymizedLog.getBytes(StandardCharsets.UTF_8));
                writeStringToZip(zos, "nzbhydra-config.yaml", anonymizedConfig.getBytes(StandardCharsets.UTF_8));
                File traceFile = new File(new File(NzbHydra.getDataFolder(), "database"), "nzbhydra.trace.db");
                if (traceFile.exists()) {
                    writeFileToZip(zos, "nzbhydra.trace.db", traceFile);
                }
                File logsFolder = new File(NzbHydra.getDataFolder(), "logs");
                //Write all GC logs
                File[] files = logsFolder.listFiles((dir, name) -> name.startsWith("gclog"));
                if (files != null) {
                    for (File file : files) {
                        writeFileToZip(zos, file.getName(), file);
                    }
                }
                //Write wrapper log
                File wrapperLog = new File(logsFolder, "wrapper.log");
                if (wrapperLog.exists()) {
                    writeFileToZip(zos, "wrapper.log", wrapperLog);
                }
            }
        }
        return Files.readAllBytes(tempFile.toPath());
    }

    protected void logDatabaseFolderSize() {
        File databaseFolder = new File(NzbHydra.getDataFolder(), "database");
        if (!databaseFolder.exists()) {
            logger.warn("Database folder not found");
            return;
        }
        File[] databaseFiles = databaseFolder.listFiles();
        if (databaseFiles == null) {
            logger.warn("No database files found");
            return;
        }
        long databaseFolderSize = Stream.of(databaseFiles).mapToLong(File::length).sum();
        logger.info("Size of database folder: {}MB", databaseFolderSize / (1024 * 1024));
    }

    protected void logNumberOfTableRows(final String tableName) {
        try {
            logger.info("Number of rows in table " + tableName + ": " + entityManager.createNativeQuery("select count(*) from " + tableName).getSingleResult());
        } catch (Exception e) {
            logger.error("Unable to get number of rows in table " + tableName, e);
        }
    }

    public static boolean isRunInDocker() {
        return new File("/.dockerenv").exists();
    }

    @Transactional
    public String executeSqlQuery(String sql) throws IOException {
        logger.info("Executing SQL query \"{}\" and returning as CSV", sql);
        File tempFile = File.createTempFile("nzbhydra", "csv");
        String path = tempFile.getAbsolutePath().replace("\\", "/");
        entityManager.createNativeQuery(String.format("CALL CSVWRITE('%s', '%s')", path, sql.replace("'", "''"))).executeUpdate();
        return new String(Files.readAllBytes(tempFile.toPath()));
    }

    @Transactional
    public String executeSqlUpdate(String sql) throws IOException {
        logger.info("Executing SQL query \"{}\"", sql);

        int affectedRows = entityManager.createNativeQuery(sql).executeUpdate();
        return String.valueOf(affectedRows);
    }

    private void writeStringToZip(ZipOutputStream zos, String name, byte[] bytes) throws IOException {
        ZipEntry zipEntry = new ZipEntry(name);
        zipEntry.setSize(bytes.length);
        zos.putNextEntry(zipEntry);
        zos.write(bytes);
        zos.closeEntry();
    }

    private void writeFileToZip(ZipOutputStream zos, String name, File file) throws IOException {
        byte[] bytes = Files.readAllBytes(file.toPath());
        writeStringToZip(zos, name, bytes);
    }


    private String getAnonymizedConfig() throws JsonProcessingException {
        return Jackson.SENSITIVE_YAML_MAPPER.writeValueAsString(configProvider.getBaseConfig());
    }

}
