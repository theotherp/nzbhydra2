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
import org.nzbhydra.NzbHydra;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.OkHttp3ClientHttpRequestFactory;

import java.io.File;
import java.io.FileReader;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("ResultOfMethodCallIgnored")
public class DatabaseRecreation {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseRecreation.class);

    private static final Map<String, String> SCHEMA_VERSION_CHANGES = new LinkedHashMap<>();


    public static void runDatabaseScript() throws Exception {
        File h2DatabaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.mv.db");
        File sqliteDatabaseFile = new File(NzbHydra.getDataFolder(), "database/nzbhydra.db");
        File databaseScriptFile = new File(NzbHydra.getDataFolder(), "databaseScript.sql");
        File databaseScriptFileNew = new File(NzbHydra.getDataFolder(), "databaseScriptNew.sql");
        File restoreScriptFile = new File(NzbHydra.getDataFolder(), "database/script.sql");

        // Check if we need to migrate from H2 to SQLite
        if (h2DatabaseFile.exists() && !sqliteDatabaseFile.exists()) {
            logger.info("Found H2 database, migrating to SQLite");
            migrateH2ToSQLite(h2DatabaseFile, sqliteDatabaseFile);
        }

        // Handle SQLite database
        String sqliteDbConnectionUrl = "jdbc:sqlite:" + sqliteDatabaseFile.getAbsolutePath();
        Class.forName("org.sqlite.JDBC");
        
        if (restoreScriptFile.exists() && !databaseScriptFile.exists()) {
            DatabaseRecreation.logger.info("No database file found but script.sql - restoring database");
            try (Connection connection = DriverManager.getConnection(sqliteDbConnectionUrl)) {
                // Read and execute the restore script
                String scriptContent = new String(Files.readAllBytes(restoreScriptFile.toPath()));
                try (Statement stmt = connection.createStatement()) {
                    for (String sql : scriptContent.split(";")) {
                        if (!sql.trim().isEmpty()) {
                            stmt.execute(sql);
                        }
                    }
                }
                restoreScriptFile.delete();
            }
        }
    }

    @SuppressWarnings("ResultOfMethodCallIgnored")
    private static void migrateH2ToSQLite(File h2DatabaseFile, File sqliteDatabaseFile) throws Exception {
        if (!h2DatabaseFile.exists()) {
            logger.debug("No H2 database file found - no migration needed");
            return;
        }

        // Check if it's actually an H2 database
        try {
            char[] buffer = new char[1024];
            try (FileReader fileReader = new FileReader(h2DatabaseFile)) {
                fileReader.read(buffer);
            }
            final String header = new String(buffer).trim();
            if (!header.contains("format:")) {
                logger.error("File doesn't appear to be an H2 database: {}", header);
                throw new RuntimeException("Invalid H2 database file header");
            }
        } catch (Exception e) {
            throw new RuntimeException("Unable to open H2 database file " + h2DatabaseFile, e);
        }

        File backupDatabaseFile = null;
        String javaExecutable;
        final File h2Jar;
        try {
            javaExecutable = getJavaExecutable();
            h2Jar = downloadJarFile("https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar");
        } catch (Exception e) {
            logger.error("Error migrating H2 database to SQLite. Unable to download H2 jar");
            throw e;
        }

        try {
            final File scriptFile = Files.createTempFile("nzbhydra", ".sql").toFile();
            scriptFile.deleteOnExit();
            final String scriptFilePath = scriptFile.getCanonicalPath();

            logger.info("Running database migration from H2 to SQLite");

            backupDatabaseFile = new File(h2DatabaseFile.getParent(), h2DatabaseFile.getName() + ".old.bak." + System.currentTimeMillis());
            logger.info("Copying old H2 database file {} to backup {} which will be automatically deleted after 14 days", h2DatabaseFile, backupDatabaseFile);
            Files.copy(h2DatabaseFile.toPath(), backupDatabaseFile.toPath());

            String h2DbConnectionUrl = "jdbc:h2:file:" + h2DatabaseFile.getAbsolutePath().replace(".mv.db", "");

            // Export H2 database to SQL script
            logger.info("Exporting H2 database to SQL script...");
            runH2Command(Arrays.asList(javaExecutable, "-Xmx700M", "-cp", h2Jar.toString(), "org.h2.tools.Script",
                            "-url", h2DbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFilePath),
                    "H2 database export failed.");

            // Create SQLite database and import data
            logger.info("Creating SQLite database from exported script...");
            createSQLiteDatabaseFromScript(sqliteDatabaseFile, scriptFile);

            // Clean up old H2 files
            logger.info("Cleaning up old H2 database files...");
            cleanupH2Files(h2DatabaseFile);

            logger.info("Successfully migrated from H2 to SQLite");

        } catch (Exception e) {
            logger.error("Error migrating H2 database to SQLite", e);
            if (backupDatabaseFile != null && backupDatabaseFile.exists()) {
                logger.info("Restoring H2 database from backup...");
                Files.copy(backupDatabaseFile.toPath(), h2DatabaseFile.toPath());
                backupDatabaseFile.delete();
            }
            throw e;
        }
    }

    private static void createSQLiteDatabaseFromScript(File sqliteDatabaseFile, File scriptFile) throws Exception {
        // Create SQLite database directory if it doesn't exist
        sqliteDatabaseFile.getParentFile().mkdirs();

        String sqliteDbConnectionUrl = "jdbc:sqlite:" + sqliteDatabaseFile.getAbsolutePath();

        try (Connection connection = DriverManager.getConnection(sqliteDbConnectionUrl)) {
            // Enable WAL mode for better concurrency
            try (Statement stmt = connection.createStatement()) {
                stmt.execute("PRAGMA journal_mode=WAL");
                stmt.execute("PRAGMA synchronous=NORMAL");
                stmt.execute("PRAGMA cache_size=10000");
                stmt.execute("PRAGMA temp_store=MEMORY");
            }

            // Read the H2 script and convert it to SQLite compatible SQL
            String scriptContent = new String(Files.readAllBytes(scriptFile.toPath()));
            logger.debug("Original H2 script content: {}", scriptContent);

            // Convert H2-specific syntax to SQLite
            String sqliteScript = convertH2ScriptToSQLite(scriptContent);
            logger.debug("Converted SQLite script content: {}", sqliteScript);

            // Execute the converted script - create a new statement for each command
            String[] sqlCommands = sqliteScript.split(";");
            int executedCount = 0;
            int skippedCount = 0;

            for (String sql : sqlCommands) {
                sql = sql.trim();
                if (!sql.isEmpty()) {
                    // Check if this SQL command is compatible with SQLite
                    if (isSQLiteCompatible(sql)) {
                        try (Statement stmt = connection.createStatement()) {
                            stmt.execute(sql);
                            executedCount++;
                            logger.debug("Executed SQL: {}", sql);
                        } catch (Exception e) {
                            logger.warn("Failed to execute SQL: {}", sql, e);
                            // Continue with other statements even if one fails
                        }
                    } else {
                        skippedCount++;
                        logger.debug("Skipped incompatible SQL: {}", sql);
                    }
                }
            }

            logger.info("SQLite migration completed: {} statements executed, {} statements skipped", executedCount, skippedCount);

            // Mark Flyway migrations as applied to prevent Flyway from trying to run them
            markFlywayMigrationsAsApplied(connection);
        }
    }

    private static void markFlywayMigrationsAsApplied(Connection connection) throws Exception {
        logger.info("Marking Flyway migrations as applied...");

        // Create the flyway_schema_history table if it doesn't exist
        try (Statement stmt = connection.createStatement()) {
            stmt.execute("""
                        CREATE TABLE IF NOT EXISTS flyway_schema_history (
                            installed_rank INTEGER PRIMARY KEY,
                            version VARCHAR(50),
                            description VARCHAR(200),
                            type VARCHAR(20),
                            script VARCHAR(1000),
                            checksum INTEGER,
                            installed_by VARCHAR(100),
                            installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            execution_time INTEGER,
                            success BOOLEAN
                        )
                    """);
        }

        // Insert records for the migrations that were "applied" during the conversion
        Object[] migrations = {
                "1", "INITIAL", "SQL", "V1__INITIAL.sql", -2068548846,
                "2", "SEQUENCES", "SQL", "V2__SEQUENCES.SQL", -1814366603
        };

        for (int i = 0; i < migrations.length; i += 5) {
            String version = (String) migrations[i];
            String description = (String) migrations[i + 1];
            String type = (String) migrations[i + 2];
            String script = (String) migrations[i + 3];
            int checksum = (Integer) migrations[i + 4];

            try (Statement stmt = connection.createStatement()) {
                stmt.execute(String.format("""
                            INSERT INTO flyway_schema_history 
                            (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
                            VALUES (%s, '%s', '%s', '%s', '%s', %d, 'SQLite Migration', 0, 1)
                        """, version, version, description, type, script, checksum));
            }
        }

        logger.info("Flyway migrations marked as applied successfully");
    }

    private static String convertH2ScriptToSQLite(String h2Script) {
        // Convert H2-specific syntax to SQLite
        String sqliteScript = h2Script
                // Remove schema references from table names (SQLite doesn't support schemas)
                .replaceAll("\"PUBLIC\"\\.\"([^\"]+)\"", "\"$1\"")
                .replaceAll("\"([^\"]+)\"\\.\"([^\"]+)\"", "\"$2\"")
                // Replace H2 sequence syntax with SQLite AUTOINCREMENT (handle all variations)
                .replaceAll("(?i)CREATE SEQUENCE \"[^\"]+\"\\.\"([A-Z_]+)\"\\s+START WITH (\\d+)(?:\\s+RESTART WITH (\\d+))?(?:\\s+INCREMENT BY (\\d+))?",
                        "CREATE TABLE $1 (next_val INTEGER); INSERT INTO $1 (next_val) VALUES ($2)")
                .replaceAll("(?i)CREATE SEQUENCE ([A-Z_]+)\\s+START WITH (\\d+)(?:\\s+RESTART WITH (\\d+))?(?:\\s+INCREMENT BY (\\d+))?",
                        "CREATE TABLE $1 (next_val INTEGER); INSERT INTO $1 (next_val) VALUES ($2)")
                // Remove any remaining INCREMENT BY clauses that might be on separate lines
                .replaceAll("(?i)\\s+INCREMENT BY \\d+", "")
                .replaceAll("(?i)\\s+RESTART WITH \\d+", "")
                // Replace H2 timestamp literals with SQLite datetime format
                .replaceAll("TIMESTAMP '([^']+)'", "datetime('$1')")
                .replaceAll("TIMESTAMP \"([^\"]+)\"", "datetime('$1')")
                // Replace H2 Unicode escape syntax with regular strings
                .replaceAll("U&'([^']*)'", "'$1'")
                .replaceAll("U&\"([^\"]*)\"", "'$1'")
                // Replace H2 boolean literals
                .replaceAll("(?i)\\bTRUE\\b", "1")
                .replaceAll("(?i)\\bFALSE\\b", "0")
                // Replace H2 data types
                .replaceAll("(?i)\\bCHARACTER LARGE OBJECT\\b", "TEXT")
                .replaceAll("(?i)\\bCHARACTER VARYING\\b", "VARCHAR")
                .replaceAll("(?i)\\bBIGINT\\b", "INTEGER")
                .replaceAll("(?i)\\bINTEGER\\b", "INTEGER")
                .replaceAll("(?i)\\bDOUBLE\\b", "REAL")
                .replaceAll("(?i)\\bFLOAT\\b", "REAL")
                .replaceAll("(?i)\\bDECIMAL\\b", "REAL")
                .replaceAll("(?i)\\bNUMERIC\\b", "REAL")
                .replaceAll("(?i)\\bBOOLEAN\\b", "INTEGER")
                // Remove H2-specific options that SQLite doesn't support
                .replaceAll("(?i)\\bON DELETE CASCADE\\b", "")
                .replaceAll("(?i)\\bON UPDATE CASCADE\\b", "")
                .replaceAll("(?i)\\bON DELETE SET NULL\\b", "")
                .replaceAll("(?i)\\bON UPDATE SET NULL\\b", "")
                .replaceAll("(?i)\\bNOCHECK\\b", "")
                .replaceAll("(?i)\\bSELECTIVITY \\d+\\b", "")
                // Remove H2-specific constraints and foreign keys
                .replaceAll("(?i)ALTER TABLE \"[^\"]+\"\\.\"[^\"]+\" ADD CONSTRAINT \"[^\"]+\" PRIMARY KEY\\([^)]+\\)", "")
                .replaceAll("(?i)ALTER TABLE \"[^\"]+\"\\.\"[^\"]+\" ADD CONSTRAINT \"[^\"]+\" UNIQUE\\([^)]+\\)", "")
                .replaceAll("(?i)ALTER TABLE \"[^\"]+\"\\.\"[^\"]+\" ADD CONSTRAINT \"[^\"]+\" FOREIGN KEY\\([^)]+\\) REFERENCES [^)]+", "")
                .replaceAll("(?i)ALTER TABLE \"[^\"]+\"\\.\"[^\"]+\" ADD CONSTRAINT \"[^\"]+\"", "")
                // Remove H2-specific table options
                .replaceAll("(?i)\\bCACHED\\b", "")
                .replaceAll("(?i)\\bNULLS FIRST\\b", "")
                .replaceAll("(?i)\\bNULLS LAST\\b", "")
                .replaceAll("(?i)\\bDESC NULLS LAST\\b", "DESC")
                .replaceAll("(?i)\\bDESC NULLS FIRST\\b", "DESC")
                // Replace H2-specific functions
                .replaceAll("(?i)\\bCURRENT_TIMESTAMP\\(\\)\\b", "CURRENT_TIMESTAMP")
                .replaceAll("(?i)\\bNOW\\(\\)\\b", "CURRENT_TIMESTAMP")
                // Remove H2-specific comments
                .replaceAll("(?m)^--.*$", "")
                // Remove empty lines
                .replaceAll("(?m)^\\s*$", "")
                // Fix potential issues with semicolons in string literals
                .replaceAll("';'", "';'");

        return sqliteScript;
    }

    private static boolean isSQLiteCompatible(String sql) {
        sql = sql.trim().toUpperCase();

        // Skip H2-specific commands that SQLite doesn't support
        if (sql.startsWith("SET ")) {
            return false; // Skip SET commands like SET RETENTION_TIME
        }
        if (sql.startsWith("CREATE SCHEMA ")) {
            return false; // SQLite doesn't have schemas
        }
        if (sql.startsWith("CREATE USER ")) {
            return false; // SQLite doesn't have users
        }
        if (sql.startsWith("CREATE ROLE ")) {
            return false; // SQLite doesn't have roles
        }
        if (sql.startsWith("GRANT ")) {
            return false; // SQLite doesn't have GRANT
        }
        if (sql.startsWith("REVOKE ")) {
            return false; // SQLite doesn't have REVOKE
        }
        if (sql.startsWith("ALTER TABLE ") && sql.contains("ADD CONSTRAINT")) {
            return false; // SQLite doesn't support adding constraints to existing tables
        }
        if (sql.startsWith("DROP CONSTRAINT ")) {
            return false; // SQLite doesn't support dropping constraints
        }
        if (sql.startsWith("CREATE SEQUENCE ")) {
            return false; // SQLite doesn't have sequences (handled by conversion)
        }
        if (sql.startsWith("DROP SEQUENCE ")) {
            return false; // SQLite doesn't have sequences
        }
        if (sql.startsWith("ALTER SEQUENCE ")) {
            return false; // SQLite doesn't have sequences
        }
        if (sql.contains("INCREMENT BY ")) {
            return false; // SQLite doesn't support INCREMENT BY
        }
        if (sql.contains("START WITH ") && !sql.contains("CREATE TABLE")) {
            return false; // SQLite doesn't support START WITH (except in CREATE TABLE)
        }
        if (sql.contains("RESTART WITH ")) {
            return false; // SQLite doesn't support RESTART WITH
        }
        if (sql.contains("_SEQ") && (sql.contains("INCREMENT") || sql.contains("START WITH") || sql.contains("RESTART"))) {
            return false; // Skip sequence-related commands
        }
        if (sql.contains("NOCHECK")) {
            return false; // SQLite doesn't support NOCHECK
        }
        if (sql.contains("SELECTIVITY")) {
            return false; // SQLite doesn't support SELECTIVITY
        }
        if (sql.contains("NULLS FIRST") || sql.contains("NULLS LAST")) {
            return false; // SQLite doesn't support NULLS FIRST/LAST
        }
        if (sql.contains("CACHED")) {
            return false; // SQLite doesn't support CACHED tables
        }
        if (sql.contains("\"PUBLIC\".")) {
            return false; // SQLite doesn't support schemas
        }

        return true;
    }

    private static void cleanupH2Files(File h2DatabaseFile) {
        try {
            // Delete H2 database files
            final File[] h2Files = h2DatabaseFile.getParentFile().listFiles((FilenameFilter) new WildcardFileFilter("*.mv.db"));
            if (h2Files != null) {
                for (File h2File : h2Files) {
                    h2File.delete();
                }
            }

            // Delete H2 trace files
            final File[] traceFiles = h2DatabaseFile.getParentFile().listFiles((FilenameFilter) new WildcardFileFilter("*.trace.db"));
            if (traceFiles != null) {
                for (File traceFile : traceFiles) {
                    traceFile.delete();
                }
            }
        } catch (Exception e) {
            logger.error("Unable to delete H2 files", e);
        }
    }

    private static void runH2Command(List<String> command, String errorMessage) throws IOException, InterruptedException {
        logger.info("Running command: " + Joiner.on(" ").join(command));
        final Process process = new ProcessBuilder(command)
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
