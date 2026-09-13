

package org.nzbhydra.database;

import com.google.common.base.Joiner;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.WildcardFileFilter;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.function.Consumer;
import java.util.function.ToLongFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Migrates existing database files written by older H2 versions to the bundled H2 version.
 * <p>
 * H2 cannot open MVStore files written by older major/minor versions. The only supported path is to export the old
 * database to an SQL script with the old H2 version and import that script with the new one. Both steps run
 * in-process and need neither a java executable nor any download: the old engine is H2 2.1.214 shipped by the
 * {@code h2legacy} module, relocated to {@code org.nzbhydra.h2legacy.org.h2} so that it can live next to the
 * bundled H2 (see {@code other/h2legacy}). It is used through {@code new
 * org.nzbhydra.h2legacy.org.h2.Driver().connect(...)} and never through {@link DriverManager}, which must keep
 * handing {@code jdbc:h2:} URLs to the bundled driver.
 * <p>
 * Only databases written by H2 2.1/2.2 ({@code format:2}) are migrated. Files written by H2 1.4 ({@code format:1})
 * are rejected; they have to be migrated with NZBHydra 8.x first, which was the last version able to do that.
 */
@SuppressWarnings("ResultOfMethodCallIgnored")
public class DatabaseRecreation {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseRecreation.class);

    /**
     * Version of the bundled H2 library, used for log messages.
     */
    static final String CURRENT_H2_VERSION = "2.4";

    /**
     * Free space required in the data folder on top of two times the database file size: the exported script (usually
     * larger than the file) and the temporary new database live next to the original file at the same time.
     */
    static final long EXTRA_REQUIRED_DISK_SPACE = 500L * 1024 * 1024;

    /**
     * Name (without extension) of the temporary database the script is imported into before it replaces the original.
     */
    static final String TEMP_DATABASE_NAME = "nzbhydra-migration-tmp";

    private static final Pattern FORMAT_PATTERN = Pattern.compile("format:(\\d+)");

    /**
     * The SCRIPT command of all H2 versions writes a line like {@code -- 123 +/- SELECT COUNT(*) FROM PUBLIC.SEARCH;}
     * before the INSERT statements of each table. For MVStore databases the number is the size of the table's
     * primary index map including uncommitted rows of other sessions. The export process is the only session on a
     * freshly opened file, so the number is the exact row count at the time of the export.
     */
    private static final Pattern ROW_COUNT_PATTERN = Pattern.compile("^--\\s*(\\d+)\\s*\\+/-\\s*SELECT COUNT\\(\\*\\) FROM\\s+(?:\"?PUBLIC\"?\\.)?\"?([A-Za-z0-9_]+)\"?\\s*;");

    private static final Map<String, String> SCHEMA_VERSION_CHANGES = new LinkedHashMap<>();

    /**
     * Message shown for database files written by H2 1.4. Migrating those was dropped after NZBHydra 8.x.
     */
    static final String H2_1_4_NOT_SUPPORTED_MESSAGE = "The database file was written by H2 1.4 which is no longer supported by NZBHydra. Migrate it with NZBHydra 8.x first - that was the last version able to convert 1.4 databases - and then update again, or delete the file to start with an empty database. The database file was not modified.";

    /**
     * Package-private hooks so tests can simulate a full disk or a broken export.
     */
    static ToLongFunction<File> usableSpaceSource = File::getUsableSpace;
    static Consumer<File> scriptPostProcessor = scriptFile -> {
    };

    enum DatabaseFormat {
        /**
         * Written by H2 1.4.x. No longer migrated, see {@link #H2_1_4_NOT_SUPPORTED_MESSAGE}.
         */
        H2_1_4("1.4"),
        /**
         * Written by H2 2.1.x / 2.2.x. Exported with the relocated H2 2.1.214 and imported as-is; the script
         * already contains the flyway schema history.
         */
        H2_2_1("2.1"),
        /**
         * Written by the bundled H2 version. Nothing to do.
         */
        CURRENT(CURRENT_H2_VERSION),
        UNKNOWN(null);

        private final String label;

        DatabaseFormat(String label) {
            this.label = label;
        }

        public String getLabel() {
            return label;
        }

        public boolean isMigrationNeeded() {
            return this == H2_2_1;
        }
    }


    public static void runDatabaseScript() throws Exception {
        //The data folder is null in tests; resolve against the working directory then, as new File(null, child) did
        File dataFolder = NzbHydra.getDataFolder() != null ? new File(NzbHydra.getDataFolder()) : new File(".");
        File databaseFile = new File(dataFolder, "database/nzbhydra.mv.db");
        File databaseScriptFile = new File(dataFolder, "databaseScript.sql");
        File restoreScriptFile = new File(dataFolder, "database/script.sql");
        String dbConnectionUrl = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");
        Class.forName("org.h2.Driver");
        migrateIfNeeded(dataFolder, databaseFile, dbConnectionUrl);
        if (restoreScriptFile.exists() && !databaseScriptFile.exists()) {
            DatabaseRecreation.logger.info("No database file found but script.sql - restoring database");
            try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa")) {
                connection.createStatement().executeUpdate("runscript from '%s';".formatted(restoreScriptFile.getCanonicalPath().replace("\\", "/")));
                restoreScriptFile.delete();
            }
        }
    }

    /**
     * Flow:
     * <ol>
     * <li>Read the MVStore header and determine the format. Current format: return. Unknown or H2 1.4: fail.</li>
     * <li>Before touching anything: require enough free disk space in the data folder.</li>
     * <li>Export the database to a script in the data folder with the relocated H2 2.1.214 ({@code SCRIPT TO}, which
     * is what {@code org.h2.tools.Script} runs). The original file stays in place.</li>
     * <li>Import the script with the bundled H2 (in-process JDBC {@code RUNSCRIPT}) into a temporary database
     * {@code nzbhydra-migration-tmp.mv.db} next to the original. Compare the row counts recorded in the script with
     * the row counts of the temporary database and close it cleanly.</li>
     * <li>Only then rename the original to {@code nzbhydra.mv.db.old.bak.<millis>} and the temporary file to
     * {@code nzbhydra.mv.db}. If the second rename fails the original is moved back.</li>
     * </ol>
     * Any failure before the final renames leaves the original file untouched (the process may even be killed during
     * the import: on the next start the original is still in place and the stale temporary file is discarded). The
     * script and the temporary database are deleted in any case. The backup file is kept and deleted after 14 days
     * by {@link org.nzbhydra.problemdetection.DeleteOldDatabaseBackupDetector}.
     */
    static void migrateIfNeeded(File dataFolder, File databaseFile, String dbConnectionUrl) throws Exception {
        if (!databaseFile.exists()) {
            logger.debug("No database file found - no recreation needed");
            return;
        }
        final DatabaseFormat format;
        try {
            format = detectFormat(readHeader(databaseFile));
        } catch (Exception e) {
            throw new RuntimeException("Unable to open database file " + databaseFile, e);
        }
        if (format == DatabaseFormat.CURRENT) {
            logger.debug("Determined existing database to be version {}. No migration needed.", format.getLabel());
            return;
        }
        if (format == DatabaseFormat.UNKNOWN) {
            logger.error("Unable to determine database version from header of {}", databaseFile);
            throw new RuntimeException("Invalid database file header");
        }
        if (format == DatabaseFormat.H2_1_4) {
            logger.error("Unable to migrate database file {}. {}", databaseFile, H2_1_4_NOT_SUPPORTED_MESSAGE);
            throw new IllegalStateException(H2_1_4_NOT_SUPPORTED_MESSAGE);
        }
        logger.info("Migrating database from H2 {} to {}, this is done once and may take several minutes for large databases", format.getLabel(), CURRENT_H2_VERSION);

        //Precondition: fail before touching the database file
        checkDiskSpace(dataFolder, databaseFile.length(), usableSpaceSource.applyAsLong(dataFolder));

        deleteTraceFiles(databaseFile);

        final File databaseFolder = databaseFile.getParentFile();
        final File tempDatabaseFile = new File(databaseFolder, TEMP_DATABASE_NAME + ".mv.db");
        final File tempTraceFile = new File(databaseFolder, TEMP_DATABASE_NAME + ".trace.db");
        final String tempConnectionUrl = "jdbc:h2:file:" + new File(databaseFolder, TEMP_DATABASE_NAME).getAbsolutePath();
        File scriptFile = null;
        try {
            deleteStaleTempFiles(tempDatabaseFile, tempTraceFile);

            scriptFile = Files.createTempFile(dataFolder.toPath(), "nzbhydra-migration", ".sql").toFile();
            final String scriptFilePath = scriptFile.getCanonicalPath();

            logger.info("Exporting database with H2 {} to {}", format.getLabel(), scriptFilePath);
            exportScript(dbConnectionUrl, scriptFile);
            scriptPostProcessor.accept(scriptFile);

            final Map<String, Long> expectedRowCounts = readRowCountsFromScript(scriptFile);
            //Format with spaces so that the log encoder does not mask values of tables whose name ends in "r"
            logger.debug("Row counts recorded in exported script: {}", expectedRowCounts.entrySet().stream().map(x -> x.getKey() + " = " + x.getValue()).collect(Collectors.joining(", ")));

            logger.info("Importing script into temporary database {} with H2 {}", tempDatabaseFile, CURRENT_H2_VERSION);
            importScript(tempConnectionUrl, scriptFile);

            verifyRowCounts(tempConnectionUrl, expectedRowCounts);
            shutdownDatabase(tempConnectionUrl);
            if (!tempDatabaseFile.isFile()) {
                throw new IllegalStateException("Temporary database file " + tempDatabaseFile + " does not exist after import");
            }
        } catch (Exception e) {
            logger.error("Error while trying to migrate database to H2 {}. The original database file was not modified.", CURRENT_H2_VERSION);
            deleteStaleTempFiles(tempDatabaseFile, tempTraceFile);
            throw e;
        } finally {
            if (scriptFile != null && scriptFile.exists() && !scriptFile.delete()) {
                logger.warn("Unable to delete temporary database script file {}", scriptFile);
            }
        }

        //The new database is complete and verified. Swap the files with two renames.
        final File backupDatabaseFile = new File(databaseFolder, databaseFile.getName() + ".old.bak." + System.currentTimeMillis());
        logger.info("Moving old database file {} to backup {} which will be automatically deleted after 14 days", databaseFile, backupDatabaseFile);
        Files.move(databaseFile.toPath(), backupDatabaseFile.toPath(), StandardCopyOption.ATOMIC_MOVE);
        try {
            Files.move(tempDatabaseFile.toPath(), databaseFile.toPath(), StandardCopyOption.ATOMIC_MOVE);
        } catch (Exception e) {
            logger.error("Unable to move migrated database {} to {}. Restoring original file from {}", tempDatabaseFile, databaseFile, backupDatabaseFile);
            Files.move(backupDatabaseFile.toPath(), databaseFile.toPath(), StandardCopyOption.ATOMIC_MOVE);
            deleteStaleTempFiles(tempDatabaseFile, tempTraceFile);
            throw e;
        }
        tempTraceFile.delete();
        logger.info("Database migration to H2 {} finished successfully", CURRENT_H2_VERSION);
    }

    private static void deleteStaleTempFiles(File tempDatabaseFile, File tempTraceFile) {
        for (File file : Arrays.asList(tempDatabaseFile, tempTraceFile)) {
            if (file.exists()) {
                logger.info("Deleting temporary migration file {}", file);
                if (!file.delete()) {
                    throw new IllegalStateException("Unable to delete temporary migration file " + file);
                }
            }
        }
    }

    /**
     * Closes the database so that the MVStore is fully flushed to disk before the file is renamed.
     */
    private static void shutdownDatabase(String dbConnectionUrl) throws Exception {
        try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa"); Statement statement = connection.createStatement()) {
            statement.execute("SHUTDOWN");
        }
    }

    static String readHeader(File databaseFile) throws IOException {
        final byte[] buffer = new byte[1024];
        int read;
        try (InputStream inputStream = Files.newInputStream(databaseFile.toPath())) {
            read = inputStream.read(buffer);
        }
        if (read <= 0) {
            return "";
        }
        return new String(buffer, 0, read, StandardCharsets.ISO_8859_1).trim();
    }

    /**
     * Determines the H2 version that wrote the database from the MVStore file header. The header is the first line
     * of the file and contains a {@code format:<n>} entry: 1 for 1.4.x, 2 for 2.0-2.2, 3 for 2.3+.
     */
    static DatabaseFormat detectFormat(String header) {
        if (header == null) {
            return DatabaseFormat.UNKNOWN;
        }
        final Matcher matcher = FORMAT_PATTERN.matcher(header);
        if (!matcher.find()) {
            return DatabaseFormat.UNKNOWN;
        }
        switch (matcher.group(1)) {
            case "1":
                return DatabaseFormat.H2_1_4;
            case "2":
                return DatabaseFormat.H2_2_1;
            case "3":
                return DatabaseFormat.CURRENT;
            default:
                return DatabaseFormat.UNKNOWN;
        }
    }

    static long getRequiredDiskSpace(long databaseFileSize) {
        return 2 * databaseFileSize + EXTRA_REQUIRED_DISK_SPACE;
    }

    /**
     * @throws IllegalStateException if the usable space is smaller than two times the database file size plus 500 MB
     */
    static void checkDiskSpace(File dataFolder, long databaseFileSize, long usableSpace) {
        final long required = getRequiredDiskSpace(databaseFileSize);
        if (usableSpace < required) {
            throw new IllegalStateException(String.format(
                "Not enough free disk space in %s for the one-time database migration. Required: %s (two times the database file size of %s plus 500 MB), available: %s. Free up disk space and restart. The database file was not modified.",
                dataFolder, FileUtils.byteCountToDisplaySize(required), FileUtils.byteCountToDisplaySize(databaseFileSize), FileUtils.byteCountToDisplaySize(usableSpace)));
        }
        logger.debug("Free disk space {} is sufficient for the required {}", FileUtils.byteCountToDisplaySize(usableSpace), FileUtils.byteCountToDisplaySize(required));
    }

    private static void deleteTraceFiles(File databaseFile) {
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
    }

    /**
     * Imports the script with the bundled H2 driver. This is what {@code org.h2.tools.RunScript} does internally, but
     * without going through the command line tool.
     */
    private static void importScript(String dbConnectionUrl, File scriptFile) throws Exception {
        final String sql = "RUNSCRIPT FROM '" + toSqlLiteral(scriptFile) + "'";
        try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa"); Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    /**
     * Exports the database with the relocated H2 2.1.214 from the {@code h2legacy} module. {@code SCRIPT TO} is what
     * {@code org.h2.tools.Script} runs; going through the driver directly means no separate JVM, no java executable
     * and no download are needed.
     * <p>
     * The driver is instantiated and used explicitly instead of asking {@link DriverManager} for a connection: the
     * relocated driver registers itself when its class is initialized and {@code jdbc:h2:} URLs must keep going to
     * the bundled driver. It is deregistered again right away.
     */
    private static void exportScript(String dbConnectionUrl, File scriptFile) throws Exception {
        final Properties properties = new Properties();
        properties.setProperty("user", "sa");
        properties.setProperty("password", "sa");
        final Driver legacyDriver = new org.nzbhydra.h2legacy.org.h2.Driver();
        try {
            try (Connection connection = legacyDriver.connect(dbConnectionUrl, properties); Statement statement = connection.createStatement()) {
                statement.execute("SCRIPT TO '" + toSqlLiteral(scriptFile) + "'");
            }
        } finally {
            deregisterLegacyDrivers();
        }
    }

    private static void deregisterLegacyDrivers() {
        for (Driver driver : Collections.list(DriverManager.getDrivers())) {
            if (driver.getClass().getName().startsWith(org.nzbhydra.h2legacy.H2Legacy.RELOCATED_PACKAGE)) {
                try {
                    DriverManager.deregisterDriver(driver);
                    logger.debug("Deregistered legacy H2 driver {}", driver.getClass().getName());
                } catch (Exception e) {
                    logger.warn("Unable to deregister legacy H2 driver {}", driver.getClass().getName(), e);
                }
            }
        }
    }

    private static String toSqlLiteral(File file) throws IOException {
        return file.getCanonicalPath().replace("\\", "/").replace("'", "''");
    }

    /**
     * Reads the row counts the old H2 version recorded per table while exporting. See {@link #ROW_COUNT_PATTERN}.
     */
    static Map<String, Long> readRowCountsFromScript(File scriptFile) throws IOException {
        final Map<String, Long> rowCounts = new LinkedHashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(scriptFile.toPath(), StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("--")) {
                    continue;
                }
                final Matcher matcher = ROW_COUNT_PATTERN.matcher(line);
                if (matcher.find()) {
                    rowCounts.put(matcher.group(2), Long.parseLong(matcher.group(1)));
                }
            }
        }
        return rowCounts;
    }

    static Map<String, Long> readRowCountsFromDatabase(String dbConnectionUrl, Iterable<String> tables) throws Exception {
        final Map<String, Long> rowCounts = new LinkedHashMap<>();
        try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa"); Statement statement = connection.createStatement()) {
            for (String table : tables) {
                try (ResultSet resultSet = statement.executeQuery("SELECT COUNT(*) FROM \"PUBLIC\".\"" + table + "\"")) {
                    resultSet.next();
                    rowCounts.put(table, resultSet.getLong(1));
                }
            }
        }
        return rowCounts;
    }

    private static void verifyRowCounts(String dbConnectionUrl, Map<String, Long> expectedRowCounts) throws Exception {
        if (expectedRowCounts.isEmpty()) {
            logger.warn("Exported script contains no row counts - unable to verify the migrated database");
            return;
        }
        final Map<String, Long> actualRowCounts = readRowCountsFromDatabase(dbConnectionUrl, expectedRowCounts.keySet());
        final List<String> mismatches = new ArrayList<>();
        for (Map.Entry<String, Long> entry : expectedRowCounts.entrySet()) {
            final Long actual = actualRowCounts.get(entry.getKey());
            if (!entry.getValue().equals(actual)) {
                mismatches.add(entry.getKey() + ": expected " + entry.getValue() + " rows but found " + actual);
            }
        }
        if (!mismatches.isEmpty()) {
            throw new IllegalStateException("Row counts of migrated database do not match the exported database: " + Joiner.on(", ").join(mismatches));
        }
        logger.info("Verified row counts of {} tables in migrated database", expectedRowCounts.size());
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
