

package org.nzbhydra.database;

import com.google.common.base.Joiner;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import okhttp3.OkHttpClient;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.WildcardFileFilter;
import org.flywaydb.core.Flyway;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.webaccess.OkHttp3ClientHttpRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;

import java.io.BufferedReader;
import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.function.ToLongFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Migrates existing database files written by older H2 versions to the bundled H2 version.
 * <p>
 * H2 cannot open MVStore files written by older major/minor versions. The only supported path is to export the old
 * database to an SQL script with the old H2 version and import that script with the new one. The export runs the
 * downloaded old H2 jar in a separate JVM (the old classes cannot live next to the bundled ones), the import runs
 * in-process with the bundled driver.
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
     * Provides the H2 jar needed to export a database of the given format. Package-private so tests can point to a
     * local jar instead of downloading one.
     */
    interface JarSource {
        File getJar(File dataFolder, DatabaseFormat format) throws IOException;
    }

    static JarSource jarSource = DatabaseRecreation::getOrDownloadJar;

    /**
     * Package-private hooks so tests can simulate a missing Java runtime, a full disk or a broken export.
     */
    static Supplier<String> javaExecutableSource = DatabaseRecreation::getJavaExecutable;
    static ToLongFunction<File> usableSpaceSource = File::getUsableSpace;
    static Consumer<File> scriptPostProcessor = scriptFile -> {
    };

    enum DatabaseFormat {
        /**
         * Written by H2 1.4.x. Needs export with 1.4.200, import with FROM_1X and a flyway baseline because the
         * schema history table did not exist yet.
         */
        H2_1_4("1.4", "https://repo1.maven.org/maven2/com/h2database/h2/1.4.200/h2-1.4.200.jar", true, true, true),
        /**
         * Written by H2 2.1.x / 2.2.x. Needs export with 2.1.214 and a plain import; the script already contains the
         * flyway schema history.
         */
        H2_2_1("2.1", "https://repo1.maven.org/maven2/com/h2database/h2/2.1.214/h2-2.1.214.jar", false, false, false),
        /**
         * Written by the bundled H2 version. Nothing to do.
         */
        CURRENT(CURRENT_H2_VERSION, null, false, false, false),
        UNKNOWN(null, null, false, false, false);

        private final String label;
        private final String jarUrl;
        private final boolean passwordResetNeeded;
        private final boolean from1x;
        private final boolean flywayBaselineNeeded;

        DatabaseFormat(String label, String jarUrl, boolean passwordResetNeeded, boolean from1x, boolean flywayBaselineNeeded) {
            this.label = label;
            this.jarUrl = jarUrl;
            this.passwordResetNeeded = passwordResetNeeded;
            this.from1x = from1x;
            this.flywayBaselineNeeded = flywayBaselineNeeded;
        }

        public String getLabel() {
            return label;
        }

        public String getJarUrl() {
            return jarUrl;
        }

        /**
         * @return the file name of the jar, e.g. {@code h2-2.1.214.jar}. A file with this name in the data folder is
         * used instead of downloading it.
         */
        public String getJarFileName() {
            return jarUrl == null ? null : jarUrl.substring(jarUrl.lastIndexOf('/') + 1);
        }

        public boolean isMigrationNeeded() {
            return this == H2_1_4 || this == H2_2_1;
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
     * <li>Read the MVStore header and determine the format. Current format: return. Unknown: fail.</li>
     * <li>Before touching anything: require a Java executable (the export runs in a separate JVM) and enough free
     * disk space in the data folder.</li>
     * <li>Download the old H2 jar and export the database to a script in the data folder using the old jar. The
     * original file stays in place.</li>
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
        logger.info("Migrating database from H2 {} to {}, this is done once and may take several minutes for large databases", format.getLabel(), CURRENT_H2_VERSION);

        //Preconditions: fail before touching the database file
        final String javaExecutable = javaExecutableSource.get();
        checkDiskSpace(dataFolder, databaseFile.length(), usableSpaceSource.applyAsLong(dataFolder));
        final File h2OldJar;
        try {
            h2OldJar = jarSource.getJar(dataFolder, format);
        } catch (Exception e) {
            logger.error("Error migrating old database. Unable to download the H2 {} library from {}. If this machine has no internet access download the file manually and put it into the data folder as {}", format.getLabel(), format.getJarUrl(), new File(dataFolder, format.getJarFileName()));
            throw e;
        }

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

            if (format.passwordResetNeeded) {
                updatePassword(dbConnectionUrl, javaExecutable, h2OldJar, "alter user sa set password 'sa'");
            }

            logger.info("Exporting database with H2 {} to {}", format.getLabel(), scriptFilePath);
            runH2Command(Arrays.asList(javaExecutable, "-Xmx700M", "-cp", h2OldJar.toString(), "org.h2.tools.Script", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-script", scriptFilePath), "Database export failed.");
            scriptPostProcessor.accept(scriptFile);

            final Map<String, Long> expectedRowCounts = readRowCountsFromScript(scriptFile);
            //Format with spaces so that the log encoder does not mask values of tables whose name ends in "r"
            logger.debug("Row counts recorded in exported script: {}", expectedRowCounts.entrySet().stream().map(x -> x.getKey() + " = " + x.getValue()).collect(Collectors.joining(", ")));

            logger.info("Importing script into temporary database {} with H2 {}", tempDatabaseFile, CURRENT_H2_VERSION);
            importScript(tempConnectionUrl, scriptFile, format.from1x);

            if (format.flywayBaselineNeeded) {
                final Flyway flyway = Flyway.configure()
                    .dataSource(tempConnectionUrl, "sa", "sa")
                    .baselineDescription("INITIAL")
                    .baselineVersion("1")
                    .load();
                flyway.baseline();
            }

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
    private static void importScript(String dbConnectionUrl, File scriptFile, boolean from1x) throws Exception {
        final String scriptPath = scriptFile.getCanonicalPath().replace("\\", "/").replace("'", "''");
        final String sql = "RUNSCRIPT FROM '" + scriptPath + "'" + (from1x ? " FROM_1X" : "");
        try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa"); Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
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

    private static void updatePassword(String dbConnectionUrl, String javaExecutable, File h2OldJar, String updatePasswordQuery) throws IOException, InterruptedException {
        try {
            runH2Command(Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-sql", NzbHydra.isOsWindows() ? ("\"" + updatePasswordQuery + "\"") : updatePasswordQuery), "Password update failed.");
        } catch (Exception e) {
            runH2Command(Arrays.asList(javaExecutable, "-cp", h2OldJar.toString(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-sql", NzbHydra.isOsWindows() ? ("\"" + updatePasswordQuery + "\"") : updatePasswordQuery), "Password update failed.");
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

    /**
     * Uses {@code <dataFolder>/<jar file name>} (e.g. {@code h2-2.1.214.jar}) if the user put it there, which allows
     * migrating on machines without internet access, and downloads the jar from Maven Central otherwise.
     */
    static File getOrDownloadJar(File dataFolder, DatabaseFormat format) throws IOException {
        final File localJar = new File(dataFolder, format.getJarFileName());
        if (localJar.isFile()) {
            logger.info("Using local H2 {} library {} instead of downloading it", format.getLabel(), localJar);
            return localJar;
        }
        logger.info("Downloading H2 {} library from {}", format.getLabel(), format.getJarUrl());
        return downloadJarFile(format.getJarUrl());
    }

    private static File downloadJarFile(String url) throws IOException {
        final ClientHttpRequest request = new OkHttp3ClientHttpRequest(new OkHttpClient(), URI.create(url), HttpMethod.GET);
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

    /**
     * @throws IllegalStateException if no Java executable can be found. Checked before the migration touches any file
     *                               because the export needs to run the old H2 version in a separate JVM.
     */
    static String getJavaExecutable() {
        return findJavaExecutable(System.getProperty("java.home"), System.getenv("JAVA_HOME"), System.getenv("PATH"), NzbHydra.isOsWindows())
            .orElseThrow(() -> new IllegalStateException("The one-time database migration to H2 " + CURRENT_H2_VERSION + " needs a Java 17+ runtime but no java executable was found in java.home, JAVA_HOME or on the PATH. Install a JRE or JDK, make sure it's on the PATH (or JAVA_HOME points to it) and restart. The database file was not modified."));
    }

    static Optional<String> findJavaExecutable(String javaHomeProperty, String javaHomeEnv, String path, boolean windows) {
        final String executableName = windows ? "java.exe" : "java";
        for (String javaHome : Arrays.asList(javaHomeProperty, javaHomeEnv)) {
            if (javaHome == null || javaHome.isBlank()) {
                continue;
            }
            final File candidate = new File(javaHome, "bin" + File.separator + executableName);
            if (candidate.isFile()) {
                logger.debug("Determined java executable: {}", candidate);
                return Optional.of(candidate.getAbsolutePath());
            }
        }
        if (path != null) {
            for (String directory : path.split(File.pathSeparator)) {
                if (directory.isBlank()) {
                    continue;
                }
                final File candidate = new File(directory, executableName);
                if (candidate.isFile()) {
                    logger.debug("Determined java executable from PATH: {}", candidate);
                    return Optional.of(candidate.getAbsolutePath());
                }
            }
        }
        return Optional.empty();
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
