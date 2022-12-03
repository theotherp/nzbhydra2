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
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.io.IOUtils;
import org.flywaydb.core.internal.resolver.ChecksumCalculator;
import org.flywaydb.core.internal.resource.StringResource;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.OkHttp3ClientHttpRequestFactory;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

public class DatabaseRecreation {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseRecreation.class);

    private static final Map<String, String> SCHEMA_VERSION_CHANGES = new LinkedHashMap<>();

    static {
        SCHEMA_VERSION_CHANGES.put("'V1.11__REMOVE_INDEXERSTATUSES.sql', \\-?\\d+", "'V1.11__REMOVE_INDEXERSTATUSES.sql', 898390205");
        SCHEMA_VERSION_CHANGES.put("'V1.17__SHORTACCESS_AGAIN.sql', \\-?\\d+", "'V1.17__SHORTACCESS_AGAIN.sql', 177884391");
    }

    public static void runDatabaseScript() throws ClassNotFoundException, SQLException {
        if (!Thread.currentThread().getName().equals("main")) {
            //During development this class is called twice (because of the Spring developer tools)
            logger.debug("Skipping database script check for thread {}", Thread.currentThread().getName());
            return;
        }
        File databaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.mv.db");
        File databaseScriptFile = new File(NzbHydra.getDataFolder(), "databaseScript.sql");
        File databaseScriptFileNew = new File(NzbHydra.getDataFolder(), "databaseScriptNew.sql");

        if (!databaseFile.exists()) {
            logger.debug("No database file found - no recreation needed");
            return;
        }

        Class.forName("org.h2.Driver");
        String dbConnectionUrl = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");

        migrateToH2v2IfNeeded(databaseFile, dbConnectionUrl);

        if (isDatabaseRecreationNotNeeded(dbConnectionUrl)) {
            return;
        }

        createDatabaseScript(databaseScriptFile, dbConnectionUrl);

        deleteExistingDatabase(databaseFile);

        replaceSchemaVersionChanges(databaseScriptFile, databaseScriptFileNew);

        runDatabaseScript(databaseScriptFile, dbConnectionUrl);
    }

    private static void migrateToH2v2IfNeeded(File databaseFile, String dbConnectionUrl) {
        try {
            char[] buffer;
            try (FileReader fileReader = new FileReader(databaseFile)) {
                buffer = new char[1024];
                final int read = fileReader.read(buffer);
            }
            final String header = new String(buffer).trim();
            if (header.contains("format:1")) {
                logger.info("Determined existing database to be version 1.4");
            } else if (header.contains("format:2")) {
                logger.info("Determined existing database to be version 2");
                return;
            } else {
                logger.error("Unable to determine database version from header {}", header);
                return;
            }
        } catch (Exception e) {
            throw new RuntimeException("Unable to open database file " + databaseFile, e);
        }
        boolean isUpgrade14To210 = true;
        if (isUpgrade14To210) {
            try {
                String javaExecutable = getJavaExecutable();
                final File h2OldJar = downloadJarFile("https://repo1.maven.org/maven2/com/h2database/h2/1.4.200/h2-1.4.200.jar");
                final File h2NewJar = downloadJarFile("https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar");
                final String scriptFile = Files.createTempFile("nzbhydra", ".zip").toFile().getCanonicalPath();
                logger.info("Running database migration from 1.4 to 2");

                final List<String> exportCommand = Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Script", "-url", dbConnectionUrl, "-user", "sa", "-script", scriptFile, "-options", "compression", "zip");
                logger.info("Running command: " + Joiner.on(" ").join(exportCommand));
                final Process exportProcess = new ProcessBuilder(exportCommand)
                    .redirectErrorStream(true)
                    .inheritIO()
                    .start();
                final int exportResult = exportProcess.waitFor();
                if (exportResult != 0) {
                    throw new RuntimeException("Database export returned with code " + exportResult);
                }

                File backupDatabaseFile = new File(databaseFile.getParent(), databaseFile.getName() + ".bak." + System.currentTimeMillis());
                logger.info("Moving old database file {} to backup {}", databaseFile, backupDatabaseFile);
                Files.move(databaseFile.toPath(), backupDatabaseFile.toPath());

                final List<String> importCommand = Arrays.asList(javaExecutable, "-cp", h2NewJar.toString(), "org.h2.tools.RunScript", "-url", dbConnectionUrl, "-user", "sa", "-script", scriptFile, "-options", "compression", "zip");
                logger.info("Running command: " + Joiner.on(" ").join(importCommand));
                final Process importProcess = new ProcessBuilder(importCommand)
                    .redirectErrorStream(true)
                    .inheritIO()
                    .start();
                final int importResult = importProcess.waitFor();
                if (importResult != 0) {
                    throw new RuntimeException("Database import returned with code " + importResult);
                }
            } catch (IOException | InterruptedException e) {
                logger.error("Error while trying to migrate database to 2.0");
            }
        }
    }

    private static File downloadJarFile(String url) throws IOException {
        final ClientHttpRequest request = new OkHttp3ClientHttpRequestFactory().createRequest(URI.create(url), HttpMethod.GET);
        final File jarFile;
        try (ClientHttpResponse response = request.execute()) {
            jarFile = Files.createTempFile("nzbhydra", ".jar").toFile();
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
        return javaExecutable;
    }

    private static boolean isDatabaseRecreationNotNeeded(String dbConnectionUrl) throws SQLException {
        logger.debug("Determining if database recreation is needed");
        Set<ExecutedScript> executedScripts = new HashSet<>();
        try (Connection conn = DriverManager.getConnection(dbConnectionUrl, "SA", "")) {
            ResultSet resultSet = conn.createStatement().executeQuery("select \"script\", \"checksum\" from \"schema_version\";");
            while (resultSet.next()) {
                executedScripts.add(new ExecutedScript(resultSet.getString(1), resultSet.getInt((2))));
            }
        }
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        try {
            HashSet<Resource> resources = Sets.newHashSet(resolver.getResources("classpath:/migration/*"));
            if (resources.stream().allMatch(x -> {
                try {
                    StringResource stringResource = new StringResource(IOUtils.toString(x.getInputStream(), Charset.defaultCharset()));
                    ExecutedScript executedScript = new ExecutedScript(x.getFilename(), ChecksumCalculator.calculate(stringResource));
                    boolean scriptExecuted = executedScripts.contains(executedScript);
                    if (!scriptExecuted) {
                        logger.info("Database recreation needed because {} was not yet executed or its checksum has changed", executedScript);
                    }
                    return scriptExecuted;
                } catch (IOException e) {
                    throw new RuntimeException("Unable to determine checksum for " + x.getFilename());
                }
            })) {
                logger.debug("No migration scripts found to run. Skipping database recreation");
                return true;
            }
        } catch (IOException e) {
            throw new RuntimeException("Unable to find migration scripts", e);
        }
        return false;
    }

    private static void runDatabaseScript(File databaseScriptFile, String dbConnectionUrl) throws SQLException {
        try (Connection conn = DriverManager.getConnection(dbConnectionUrl, "SA", "")) {
            logger.info("Running database script {} for reimport of old database", databaseScriptFile.getAbsolutePath());
            try {
                conn.createStatement().execute("runscript from '" + databaseScriptFile.getAbsolutePath() + "'");
            } catch (SQLException e) {
                throw new RuntimeException("Unable to import database script", e);
            }
            logger.info("Successfully recreated database");
        }
        boolean deleted = databaseScriptFile.delete();
        if (!deleted) {
            throw new RuntimeException("Unable to delete database script file at " + databaseScriptFile.getAbsolutePath() + ". Please delete it manually.");
        }
    }

    private static void replaceSchemaVersionChanges(File databaseScriptFile, File databaseScriptFileNew) {
        try {
            try (FileWriter fileWriter = new FileWriter(databaseScriptFileNew)) {
                try (Stream<String> lines = Files.lines(databaseScriptFile.toPath())) {
                    lines.forEach(line -> {
                        String sql = line;
                        for (Map.Entry<String, String> entry : SCHEMA_VERSION_CHANGES.entrySet()) {
                            sql = sql.replaceAll(entry.getKey(), entry.getValue());
                        }
                        try {
                            fileWriter.write(sql);
                            fileWriter.write(System.getProperty("line.separator"));
                        } catch (IOException e) {
                            throw new RuntimeException("Unable to write to temp file " + databaseScriptFileNew, e);
                        }
                    });
                }
            }
            if (!databaseScriptFile.delete()) {
                throw new RuntimeException("Unable to delete existing database script file " + databaseScriptFile);
            }
            Files.move(databaseScriptFileNew.toPath(), databaseScriptFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Unable to update database migration versions", e);
        }
    }

    private static void deleteExistingDatabase(File databaseFile) {
        if (!databaseFile.exists()) {
            throw new RuntimeException("Unable to find database file at " + databaseFile.getAbsolutePath());
        }
        boolean deleted = databaseFile.delete();
        if (!deleted) {
            throw new RuntimeException("Unable to delete database file at " + databaseFile.getAbsolutePath() + ". Please move it somewhere else (just to be sure) and restart NZBHYdra.");
        }
    }

    private static void createDatabaseScript(File databaseScriptFile, String url) throws SQLException {
        if (databaseScriptFile.exists()) {
            boolean deleted = databaseScriptFile.delete();
            if (!deleted) {
                throw new RuntimeException("Unable to delete database script file at " + databaseScriptFile.getAbsolutePath() + ". Please delete it manually and restart NZBHYdra.");
            }
        }
        logger.info("Recreating database to ensure successful migration. This may take a couple of minutes...");

        try (Connection conn = DriverManager.getConnection(url, "SA", "")) {
            logger.info("Creating database script {} from database", databaseScriptFile.getAbsolutePath());
            conn.createStatement().execute(String.format("script to '%s'", databaseScriptFile));
            if (!databaseScriptFile.exists()) {
                throw new RuntimeException("Database script file was not created at " + databaseScriptFile.getAbsolutePath());
            }
        }
    }

    @Data
    @AllArgsConstructor
    @EqualsAndHashCode
    private static class ExecutedScript {
        private String script;
        private int checksum;
    }
}
