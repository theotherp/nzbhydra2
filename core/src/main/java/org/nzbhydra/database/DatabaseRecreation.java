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
import org.flywaydb.core.Flyway;
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.OkHttp3ClientHttpRequestFactory;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DatabaseRecreation {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseRecreation.class);

    private static final Map<String, String> SCHEMA_VERSION_CHANGES = new LinkedHashMap<>();

    static {
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

                File backupDatabaseFile = new File(databaseFile.getParent(), databaseFile.getName() + ".bak." + System.currentTimeMillis());
                logger.info("Copying old database file {} to backup {}", databaseFile, backupDatabaseFile);
                Files.copy(databaseFile.toPath(), backupDatabaseFile.toPath());

                runH2Command(Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-sql", "\"alter user sa set password 'sa'\""), "Password update failed.");

                runH2Command(Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Script", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFile, "-options", "compression", "zip"), "Database export failed.");


                final boolean deleted = databaseFile.delete();
                if (!deleted) {
                    throw new RuntimeException("Unable to delete file " + databaseFile);
                }

                runH2Command(Arrays.asList(javaExecutable, "-cp", h2NewJar.toString(), "org.h2.tools.RunScript", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFile, "-options", "compression", "zip"), "Database import failed.");

                final Flyway flyway = Flyway.configure()
                        .dataSource(dbConnectionUrl, "sa", "sa")
                        .baselineDescription("INITIAL")
                        .baselineVersion("1")
                        .load();
                flyway.baseline();

            } catch (IOException | InterruptedException e) {
                logger.error("Error while trying to migrate database to 2.0");
            }
        }
    }

    private static void runH2Command(List<String> updatePassCommand, String errorMessage) throws IOException, InterruptedException {
        logger.info("Running command: " + Joiner.on(" ").join(updatePassCommand));
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


    @Data
    @AllArgsConstructor
    @EqualsAndHashCode
    private static class ExecutedScript {
        private String script;
        private int checksum;
    }
}
