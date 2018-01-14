package org.nzbhydra.debuginfos;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.sensitive.SensitiveDataModule;
import org.nzbhydra.logging.LogAnonymizer;
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
import java.nio.file.Files;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class DebugInfosProvider {

    private static final Logger logger = LoggerFactory.getLogger(DebugInfosProvider.class);

    @Autowired
    private LogAnonymizer logAnonymizer;
    @Autowired
    private ConfigProvider configProvider;
    @PersistenceContext
    private EntityManager entityManager;

    public byte[] getDebugInfosAsZip() throws IOException {
        logger.info("Creating debug infos");
        logger.info("NZBHydra2 version: {}", NzbHydra.class.getPackage().getImplementationVersion());
        logger.info("Java command line: {}", System.getProperty("sun.java.command"));
        logger.info("Java runtime name: {}", System.getProperty("java.runtime.name"));
        logger.info("Java runtime version: {}", System.getProperty("java.runtime.version"));
        logger.info("OS name: {}", System.getProperty("os.name"));
        logger.info("OS architecture: {}", System.getProperty("os.arch"));
        logger.info("User country: {}", System.getProperty("user.country"));
        logger.info("File encoding: {}", System.getProperty("file.encoding"));
        if(isRunInDocker()) {
            logger.info("Apparently run in docker");
        }

        String anonymizedConfig = getAnonymizedConfig();
        String anonymizedLog = logAnonymizer.getAnonymizedLog();
        File tempFile = File.createTempFile("nzbhydradebuginfos", "zip");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            try (ZipOutputStream zos = new ZipOutputStream(fos)) {
                writeStringToZip(zos, "nzbhydra.log", anonymizedLog.getBytes("UTF-8"));
                writeStringToZip(zos, "nzbhydra-config.yaml", anonymizedConfig.getBytes("UTF-8"));
                File traceFile = new File(new File(NzbHydra.getDataFolder(), "database"), "nzbhydra.trace.db");
                if (traceFile.exists()) {
                    writeFileToZip(zos,"nzbhydra.trace.db",traceFile);
                }
            }
        }
        return Files.readAllBytes(tempFile.toPath());
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
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
        objectMapper.registerModule(new Jdk8Module());
        objectMapper.registerModule(new SensitiveDataModule());
        return objectMapper.writeValueAsString(configProvider.getBaseConfig());
    }

}
