/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.database;

import com.google.common.base.Joiner;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.WildcardFileFilter;
import org.apache.commons.lang3.RandomStringUtils;
import org.flywaydb.core.Flyway;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.io.File;
import java.io.FileReader;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@SuppressWarnings("ResultOfMethodCallIgnored")
public class DatabaseRecreation {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseRecreation.class);
    private static final Map<String, String> SCHEMA_VERSION_CHANGES = new LinkedHashMap<>();
    private static final SimpleClientHttpRequestFactory simpleClientHttpRequestFactory = new SimpleClientHttpRequestFactory();
    private static final String DB_TOOL_URL_BASE = "https://github.com/theotherp/h2-db-tool/releases/download/1.0.0/nzbhydra-db-tool-";
    private static final String DB_TOOL_OLD_VERSION = "2-1-214";
    private static final String DB_TOOL_NEW_VERSION = "2-3-232";
    private static final String JAR_URL_OLD_VERSION = "https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar";
    private static final String JAR_URL_NEW_VERSION = "https://repo1.maven.org/maven2/com/h2database/h2/2.3.232/h2-2.3.232.jar";


    public static void runDatabaseScript() throws Exception {
        File databaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.mv.db");
        File databaseScriptFile = new File(NzbHydra.getDataFolder(), "databaseScript.sql");
        File databaseScriptFileNew = new File(NzbHydra.getDataFolder(), "databaseScriptNew.sql");
        File restoreScriptFile = new File(NzbHydra.getDataFolder(), "database/script.sql");
        String dbConnectionUrl = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");
        Class.forName("org.h2.Driver");
        migrateToH2v2IfNeeded(databaseFile, dbConnectionUrl);
        if (restoreScriptFile.exists() && !databaseScriptFile.exists()) {
            DatabaseRecreation.logger.info("No database file found but script.sql - restoring database");
            try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa")) {
                connection.createStatement().executeUpdate("runscript from '%s';".formatted(restoreScriptFile.getCanonicalPath().replace("\\", "/")));
                restoreScriptFile.delete();
            }
        }


    }

    @SuppressWarnings("ResultOfMethodCallIgnored")
    private static void migrateToH2v2IfNeeded(File databaseFile, String dbConnectionUrl) throws Exception {
        if (!databaseFile.exists()) {
            logger.debug("No database file found - no recreation needed");
            return;
        }
        try {
            char[] buffer;
            try (FileReader fileReader = new FileReader(databaseFile)) {
                buffer = new char[1024];
                final int read = fileReader.read(buffer);
            }
            final String header = new String(buffer).trim();
            if (header.contains("format:1")) {
                logger.info("Determined existing database to be version 1.4. Migration needed. Use any version lower than 7.10.0");
                return;
            } else if (header.contains("format:2")) {
                logger.info("Determined existing database to be version 2. Migration needed to version 3.");
            } else if (header.contains("format:3")) {
                logger.info("Determined existing database to be version 3. No migration needed.");
                return;
            } else {
                logger.error("Unable to determine database version from header {}", header);
                throw new RuntimeException("Invalid database file header");
            }
        } catch (Exception e) {
            throw new RuntimeException("Unable to open database file " + databaseFile, e);
        }

        try {
            final File[] traceFiles = databaseFile.getParentFile().listFiles((FilenameFilter) new WildcardFileFilter("*.trace.db"));
            if (traceFiles != null) {
                for (File traceFile : traceFiles) {
                    traceFile.delete();
                }
            }
        } catch (Exception e) {
            logger.error("Unable to delete trace files", e);
        }

        File backupDatabaseFile = null;
        String javaExecutable;
        final File fileOldVersion;
        final File fileNewVersion;
        final String scriptFilePath;
        boolean useJava;

        try {
            logger.debug("org.graalvm.nativeimage.imagecode: {}", System.getProperty("org.graalvm.nativeimage.imagecode"));
            boolean useDbTool = System.getProperty("org.graalvm.nativeimage.imagecode") != null;
            if ("false".equals(System.getenv("use_db_tool"))) {
                logger.debug("Not using DB tool");
                useDbTool = false;
            }

            if (useDbTool) {
                String suffix;
                String fileEnding = "";
                if (System.getProperty("os.name").toLowerCase().contains("win")) {
                    logger.debug("Determined OS is windows");
                    suffix = "-amd64.exe";
                    fileEnding = ".exe";
                } else if (System.getProperty("os.arch").toLowerCase().contains("arm") || System.getProperty("os.arch").toLowerCase().contains("aarch")) {
                    logger.debug("Determined architecture is arm");
                    suffix = "-aarch64";
                } else {
                    logger.debug("Determined architecture is amd64");
                    suffix = "-amd64";
                }
                logger.info("Recreating database using executable {}", suffix);
                useJava = false;
                fileOldVersion = downloadFile(DB_TOOL_URL_BASE + DB_TOOL_OLD_VERSION + suffix + ".zip", fileEnding);
                fileNewVersion = downloadFile(DB_TOOL_URL_BASE + DB_TOOL_NEW_VERSION + suffix + ".zip", fileEnding);
                fileOldVersion.setExecutable(true);
                fileNewVersion.setExecutable(true);
            } else {
                logger.info("Recreating database using JARs");
                useJava = true;
                fileOldVersion = downloadFile(JAR_URL_OLD_VERSION, ".jar");
                fileNewVersion = downloadFile(JAR_URL_NEW_VERSION, ".jar");
            }

        } catch (Exception e) {
            logger.error("Error migrating old database. Unable to download db tools");
            throw e;
        }
        try {
            final File scriptFile = Files.createTempFile("nzbhydra", ".sql").toFile();
            scriptFile.deleteOnExit();
            scriptFilePath = scriptFile.getCanonicalPath();

            logger.info("Running database migration from 2 to 3");

            backupDatabaseFile = new File(databaseFile.getParent(), databaseFile.getName() + ".old.bak." + System.currentTimeMillis());
            logger.info("Copying old database file {} to backup {} which will be automatically deleted after 14 days", databaseFile, backupDatabaseFile);
            Files.copy(databaseFile.toPath(), backupDatabaseFile.toPath());


            List<String> parameters = new ArrayList<>(Arrays.asList(fileOldVersion.toString(), "org.h2.tools.Script", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFilePath));
            runDbTool(getCommands(parameters, useJava), "Database export failed.");
        } catch (Exception e) {
            logger.error("Error migrating old database file to new one");
            if (backupDatabaseFile != null && backupDatabaseFile.exists()) {
                if (backupDatabaseFile != null && backupDatabaseFile.exists()) {
                    backupDatabaseFile.delete();
                }
            }

            throw e;
        }
        try {
            final boolean deleted = databaseFile.delete();
            if (!deleted) {
                throw new RuntimeException("Unable to delete old database file " + databaseFile);
            }

            List<String> parameters = new ArrayList<>(Arrays.asList(fileNewVersion.toString(), "org.h2.tools.RunScript", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFilePath, "-options", "FROM_1X"));

            runDbTool(getCommands(parameters, useJava), "Database import failed.");

            final Flyway flyway = Flyway.configure()
                    .dataSource(dbConnectionUrl, "sa", "sa")
                    .baselineDescription("INITIAL")
                    .baselineVersion("1")
                    .load();
            flyway.baseline();
        } catch (Exception e) {
            logger.error("Error while trying to migrate database to 3.0");
            if (backupDatabaseFile != null && backupDatabaseFile.exists()) {
                logger.info("Restoring database file {} from backup {}", databaseFile, backupDatabaseFile);
                Files.move(backupDatabaseFile.toPath(), databaseFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }
            throw new RuntimeException(e);
        }
        FileUtils.deleteQuietly(fileOldVersion);
        FileUtils.deleteQuietly(fileNewVersion);
        FileUtils.deleteQuietly(new File(scriptFilePath));
    }

    private static List<String> getCommands(List<String> parameters, boolean useJava) {
        if (!useJava) {
            return parameters;
        }
        final List<String> commands = new ArrayList<>(parameters);
        commands.add(0, getJavaExecutable());
        commands.add(1, "-Xmx700M");
        commands.add(2, "-cp");
        return commands;
    }


    private static void runDbTool(List<String> commandParameters, String errorMessage) throws IOException, InterruptedException {
        logger.info("Running command: {}", Joiner.on(" ").join(commandParameters));
        final Process process = new ProcessBuilder(commandParameters)
                .redirectErrorStream(true)
                .inheritIO()
                .start();
        final int result = process.waitFor();
        if (result != 0) {
            throw new RuntimeException(errorMessage + ". Code: " + result);
        }
    }

    private static File downloadFile(String url, String suffix) throws IOException {
        //Can't use Hydra request factory as no config was loaded
        final ClientHttpRequest request = simpleClientHttpRequestFactory.createRequest(URI.create(url), HttpMethod.GET);

        //Do not use a temporary folder because we may not have writing or execution rights there but we should have them inside our own folder
        final File file = new File(NzbHydra.getDataFolder(), "dbrecreation-" + RandomStringUtils.insecure().nextAlphabetic(5) + suffix);
        file.delete();
        logger.debug("Downloading file from {} to {}. Will be deleted on exit", url, file);
        try (ClientHttpResponse response = request.execute()) {

            file.deleteOnExit();
            try (InputStream body = response.getBody()) {
                if (url.endsWith(".zip")) {
                    extractZip(body, file);
                } else {
                    com.google.common.io.Files.asByteSink(file).writeFrom(body);
                }
            }
            if (response.getStatusCode() != HttpStatus.OK) {
                throw new RuntimeException("Unable to download file. Response: " + response.getStatusCode());
            }
        }
        if (!file.exists()) {
            throw new RuntimeException("Unable to download file to " + file);
        }
        return file;

    }

    private static String getJavaExecutable() {
        String javaExecutable;
        if (System.getProperty("os.name").startsWith("Win")) {
            javaExecutable = System.getProperties().getProperty("java.home") + File.separator + "bin" + File.separator + "java.exe";
        } else {
            javaExecutable = System.getProperties().getProperty("java.home") + File.separator + "bin" + File.separator + "java";
        }
        if (new File(javaExecutable).exists()) {
            logger.debug("Determined java executable: {}", javaExecutable);
        } else {
            logger.debug("Java executable not found. Trying just java and hope it's in path");
            javaExecutable = "java";
        }
        return javaExecutable;
    }

    private static void extractZip(InputStream inputStream, File destFile) throws IOException {
        try (ZipInputStream zipIn = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((zipIn.getNextEntry()) != null) {
                try (OutputStream out = Files.newOutputStream(destFile.toPath())) {
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    while ((bytesRead = zipIn.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                }
                zipIn.closeEntry();
            }
        }
    }


    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @EqualsAndHashCode
    private static class ExecutedScript {
        private String script;
        private int checksum;
    }
}
