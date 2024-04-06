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
import org.apache.commons.io.filefilter.WildcardFileFilter;
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
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("ResultOfMethodCallIgnored")
public class DatabaseRecreation {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseRecreation.class);

    private static final Map<String, String> SCHEMA_VERSION_CHANGES = new LinkedHashMap<>();


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
                logger.info("Determined existing database to be version 1.4. Migration needed.");
            } else if (header.contains("format:2")) {
                logger.info("Determined existing database to be version 2. No migration needed.");
                return;
            } else {
                logger.error("Unable to determine database version from header {}", header);
                throw new RuntimeException("Invalid database file header");
            }
        } catch (Exception e) {
            throw new RuntimeException("Unable to open database file " + databaseFile, e);
        }
        boolean isUpgrade14To210 = true;
        if (isUpgrade14To210) {

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
            final File h2OldJar;
            final File h2NewJar;
            final String scriptFilePath;
            try {
                javaExecutable = getJavaExecutable();
                h2OldJar = downloadJarFile("https://repo1.maven.org/maven2/com/h2database/h2/1.4.200/h2-1.4.200.jar");
                h2NewJar = downloadJarFile("https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar");
            } catch (Exception e) {
                logger.error("Error migrating old database. Unable to download h2 jars");
                throw e;
            }
            try {
                final File scriptFile = Files.createTempFile("nzbhydra", ".sql").toFile();
                scriptFile.deleteOnExit();
                scriptFilePath = scriptFile.getCanonicalPath();

                logger.info("Running database migration from 1.4 to 2");

                backupDatabaseFile = new File(databaseFile.getParent(), databaseFile.getName() + ".old.bak." + System.currentTimeMillis());
                logger.info("Copying old database file {} to backup {} which will be automatically deleted after 14 days", databaseFile, backupDatabaseFile);
                Files.copy(databaseFile.toPath(), backupDatabaseFile.toPath());

                final String updatePasswordQuery = "alter user sa set password 'sa'";
                updatePassword(dbConnectionUrl, javaExecutable, h2OldJar, updatePasswordQuery);

                runH2Command(Arrays.asList(javaExecutable, "-Xmx700M", "-cp", h2OldJar.toString(), "org.h2.tools.Script", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFilePath), "Database export failed.");
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

                runH2Command(Arrays.asList(javaExecutable, "-Xmx700M", "-cp", h2NewJar.toString(), "org.h2.tools.RunScript", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFilePath, "-options", "FROM_1X"), "Database import failed.");

                final Flyway flyway = Flyway.configure()
                        .dataSource(dbConnectionUrl, "sa", "sa")
                        .baselineDescription("INITIAL")
                        .baselineVersion("1")
                        .load();
                flyway.baseline();
            } catch (Exception e) {
                logger.error("Error while trying to migrate database to 2.0");
                if (backupDatabaseFile != null && backupDatabaseFile.exists()) {
                    logger.info("Restoring database file {} from backup {}", databaseFile, backupDatabaseFile);
                    Files.move(backupDatabaseFile.toPath(), databaseFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
                }
                throw new RuntimeException(e);
            }
        }
    }

    private static void updatePassword(String dbConnectionUrl, String javaExecutable, File h2OldJar, String updatePasswordQuery) throws IOException, InterruptedException {
        try {
            runH2Command(Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-sql", NzbHydra.isOsWindows() ? ("\"" + updatePasswordQuery + "\"") : updatePasswordQuery), "Password update failed.");
        } catch (Exception e) {
            runH2Command(Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-sql", NzbHydra.isOsWindows() ? ("\"" + updatePasswordQuery + "\"") : updatePasswordQuery), "Password update failed.");
        }
    }

    private static void runH2Command(List<String> updatePassCommand, String errorMessage) throws IOException, InterruptedException {
        logger.info("Running command: {}", Joiner.on(" ").join(updatePassCommand));
        final Process process = new ProcessBuilder(updatePassCommand)
                .redirectErrorStream(true)
                .inheritIO()
                .start();
        final int result = process.waitFor();
        if (result != 0) {
            throw new RuntimeException(errorMessage + ". Code: " + result);
        }
    }

    private static File downloadJarFile(String url) throws IOException {
        final ClientHttpRequest request = new SimpleClientHttpRequestFactory().createRequest(URI.create(url), HttpMethod.GET);
        final File jarFile;
        try (ClientHttpResponse response = request.execute()) {
            jarFile = Files.createTempFile("nzbhydra", ".jar").toFile();
            logger.debug("Downloaded file from {} to {}. Will be deleted on exit", url, jarFile);
            jarFile.deleteOnExit();
            try (InputStream body = response.getBody()) {
                com.google.common.io.Files.asByteSink(jarFile).writeFrom(body);
            }
            if (response.getStatusCode() != HttpStatus.OK) {
                throw new RuntimeException("Unable to download database library. Response: " + response.getStatusCode());
            }
        }
        return jarFile;

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


    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @EqualsAndHashCode
    private static class ExecutedScript {
        private String script;
        private int checksum;
    }
}
