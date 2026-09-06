package org.nzbhydra.database;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.api.io.TempDir;
import org.nzbhydra.database.DatabaseRecreation.DatabaseFormat;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class DatabaseRecreationTest {

    private static final String H2_1_4_HEADER = "H:2,blockSize:1000,created:1a076457bc1,format:1,fletcher:bd999d15";
    private static final String H2_2_1_HEADER = "H:2,block:30,blockSize:1000,chunk:c,clean:1,created:1a076449d10,format:2,version:c,fletcher:f3a7842a";
    private static final String H2_2_4_HEADER = "H:2,block:3,blockSize:1000,chunk:2,clean:1,created:1a07644a66c,format:3,version:2,fletcher:7a1d70de";

    /**
     * Only used to <i>create</i> the database files the migration is tested against, in a separate JVM. The migration
     * itself always runs in-process with the relocated H2 from the h2legacy module.
     */
    private static final File OLD_H2_JAR = new File(System.getProperty("user.home"), ".m2/repository/com/h2database/h2/2.1.214/h2-2.1.214.jar");

    @TempDir
    Path tempDir;

    @AfterEach
    public void tearDown() {
        DatabaseRecreation.usableSpaceSource = File::getUsableSpace;
        DatabaseRecreation.scriptPostProcessor = scriptFile -> {
        };
    }

    @Test
    public void shouldDetectFormatFromHeader() {
        assertThat(DatabaseRecreation.detectFormat(H2_1_4_HEADER)).isEqualTo(DatabaseFormat.H2_1_4);
        assertThat(DatabaseRecreation.detectFormat(H2_2_1_HEADER)).isEqualTo(DatabaseFormat.H2_2_1);
        assertThat(DatabaseRecreation.detectFormat(H2_2_4_HEADER)).isEqualTo(DatabaseFormat.CURRENT);
        assertThat(DatabaseRecreation.detectFormat("H:2,blockSize:1000,format:99,fletcher:bd999d15")).isEqualTo(DatabaseFormat.UNKNOWN);
        assertThat(DatabaseRecreation.detectFormat("garbage")).isEqualTo(DatabaseFormat.UNKNOWN);
        assertThat(DatabaseRecreation.detectFormat("")).isEqualTo(DatabaseFormat.UNKNOWN);
        assertThat(DatabaseRecreation.detectFormat(null)).isEqualTo(DatabaseFormat.UNKNOWN);
    }

    @Test
    public void shouldOnlyMigrateFormat2() {
        assertThat(DatabaseFormat.H2_2_1.isMigrationNeeded()).isTrue();
        assertThat(DatabaseFormat.H2_1_4.isMigrationNeeded()).isFalse();
        assertThat(DatabaseFormat.CURRENT.isMigrationNeeded()).isFalse();
        assertThat(DatabaseFormat.UNKNOWN.isMigrationNeeded()).isFalse();
    }

    @Test
    public void shouldReadHeaderFromFile() throws IOException {
        final File file = tempDir.resolve("nzbhydra.mv.db").toFile();
        Files.write(file.toPath(), (H2_2_1_HEADER + "\n" + "x".repeat(5000)).getBytes(StandardCharsets.ISO_8859_1));

        assertThat(DatabaseRecreation.detectFormat(DatabaseRecreation.readHeader(file))).isEqualTo(DatabaseFormat.H2_2_1);
    }

    @Test
    public void shouldRequireTwiceTheFileSizePlus500Mb() {
        final long fileSize = 100L * 1024 * 1024;

        assertThat(DatabaseRecreation.getRequiredDiskSpace(fileSize)).isEqualTo(700L * 1024 * 1024);
    }

    @Test
    public void shouldAcceptSufficientDiskSpace() {
        final long fileSize = 100L * 1024 * 1024;

        DatabaseRecreation.checkDiskSpace(tempDir.toFile(), fileSize, 700L * 1024 * 1024);
    }

    @Test
    public void shouldRejectInsufficientDiskSpace() {
        final long fileSize = 100L * 1024 * 1024;

        assertThatThrownBy(() -> DatabaseRecreation.checkDiskSpace(tempDir.toFile(), fileSize, 699L * 1024 * 1024))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Required: 700 MB")
            .hasMessageContaining("database file size of 100 MB")
            .hasMessageContaining("available: 699 MB")
            .hasMessageContaining("was not modified");
    }

    @Test
    public void shouldAbortBeforeTouchingFileWhenDiskSpaceIsInsufficient() throws Exception {
        final File databaseFile = createFakeDatabaseFile(H2_2_1_HEADER);
        final byte[] originalContent = Files.readAllBytes(databaseFile.toPath());
        DatabaseRecreation.usableSpaceSource = folder -> 0L;

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Not enough free disk space");

        assertThat(Files.readAllBytes(databaseFile.toPath())).isEqualTo(originalContent);
        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
        assertThat(dataFolderScriptFiles()).isEmpty();
    }

    /**
     * H2 1.4 databases are no longer migrated. The file must be left exactly as it is and the message must say what
     * to do instead.
     */
    @Test
    public void shouldRejectH2_1_4DatabaseWithoutTouchingFile() throws Exception {
        final File databaseFile = createFakeDatabaseFile(H2_1_4_HEADER);
        final byte[] originalContent = Files.readAllBytes(databaseFile.toPath());
        DatabaseRecreation.usableSpaceSource = folder -> {
            throw new AssertionError("Must not be called");
        };

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("written by H2 1.4")
            .hasMessageContaining("NZBHydra 8.x")
            .hasMessageContaining("was not modified");

        assertThat(Files.readAllBytes(databaseFile.toPath())).isEqualTo(originalContent);
        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
        assertThat(dataFolderScriptFiles()).isEmpty();
    }

    @Test
    public void shouldFailOnUnknownFormatWithoutTouchingFile() throws Exception {
        final File databaseFile = createFakeDatabaseFile("H:2,blockSize:1000,format:99");
        DatabaseRecreation.usableSpaceSource = folder -> {
            throw new AssertionError("Must not be called");
        };

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra")))
            .hasMessageContaining("Invalid database file header");

        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
    }

    @Test
    public void shouldDoNothingForCurrentFormat() throws Exception {
        final File databaseFile = createFakeDatabaseFile(H2_2_4_HEADER);
        DatabaseRecreation.usableSpaceSource = folder -> {
            throw new AssertionError("Must not be called");
        };

        DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra"));

        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
    }

    @Test
    public void shouldReadRowCountsFromScript() throws IOException {
        final File scriptFile = tempDir.resolve("script.sql").toFile();
        Files.write(scriptFile.toPath(), Arrays.asList(
            "CREATE USER IF NOT EXISTS \"SA\" SALT '..' HASH '..' ADMIN;",
            "CREATE CACHED TABLE \"PUBLIC\".\"SEARCH\"(",
            "    \"ID\" INTEGER NOT NULL",
            ");",
            "-- 12 +/- SELECT COUNT(*) FROM PUBLIC.SEARCH;     ",
            "INSERT INTO \"PUBLIC\".\"SEARCH\" VALUES",
            "(1),",
            "(2);",
            "-- 0 +/- SELECT COUNT(*) FROM PUBLIC.INDEXER;",
            "-- 3 +/- SELECT COUNT(*) FROM PUBLIC.T;        ",
            "-- 7 +/- SELECT COUNT(*) FROM \"PUBLIC\".\"quoted\";",
            "-- 8 +/- SELECT COUNT(*) FROM \"PUBLIC\".\"flyway_schema_history\";",
            "-- some other comment"
        ), StandardCharsets.UTF_8);

        final Map<String, Long> rowCounts = DatabaseRecreation.readRowCountsFromScript(scriptFile);

        assertThat(rowCounts).containsExactly(
            Map.entry("SEARCH", 12L),
            Map.entry("INDEXER", 0L),
            Map.entry("T", 3L),
            //Case must be kept: the script quotes identifiers and Flyway's history table is lowercase
            Map.entry("quoted", 7L),
            Map.entry("flyway_schema_history", 8L)
        );
    }

    /**
     * Creates a real H2 2.1.214 database in a separate JVM using the jar from the local maven repository, runs the
     * migration against it and checks the result. The migration itself runs completely in-process: no jar, no java
     * executable, no download. Skipped when the old jar is not available for the setup.
     */
    @Test
    @EnabledIf("isOldH2JarAvailable")
    public void shouldMigrate21DatabaseToCurrentVersion() throws Exception {
        final File databaseFolder = tempDir.resolve("database").toFile();
        assertThat(databaseFolder.mkdirs()).isTrue();
        final File databaseFile = new File(databaseFolder, "nzbhydra.mv.db");
        final String dbConnectionUrl = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");
        createDatabaseWithOldH2(dbConnectionUrl, "create table t(id int primary key, v varchar); insert into t values (1,'a'); insert into t values (2,'b'); create table empty(id int)");
        assertThat(DatabaseRecreation.detectFormat(DatabaseRecreation.readHeader(databaseFile))).isEqualTo(DatabaseFormat.H2_2_1);
        //Stale temporary file from a previous attempt that was killed
        Files.write(new File(databaseFolder, "nzbhydra-migration-tmp.mv.db").toPath(), "garbage".getBytes(StandardCharsets.ISO_8859_1));

        DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, dbConnectionUrl);

        assertThat(databaseFile).exists();
        assertThat(DatabaseRecreation.detectFormat(DatabaseRecreation.readHeader(databaseFile))).isEqualTo(DatabaseFormat.CURRENT);
        try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa"); Statement statement = connection.createStatement()) {
            try (ResultSet resultSet = statement.executeQuery("select id, v from t order by id")) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getInt(1)).isEqualTo(1);
                assertThat(resultSet.getString(2)).isEqualTo("a");
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getInt(1)).isEqualTo(2);
                assertThat(resultSet.getString(2)).isEqualTo("b");
                assertThat(resultSet.next()).isFalse();
            }
        }
        assertThat(DatabaseRecreation.readRowCountsFromDatabase(dbConnectionUrl, List.of("T", "EMPTY"))).containsExactly(Map.entry("T", 2L), Map.entry("EMPTY", 0L));
        assertThat(databaseFolderFiles()).hasSize(2).contains("nzbhydra.mv.db");
        assertThat(databaseFolderFiles()).anyMatch(name -> name.matches("nzbhydra\\.mv\\.db\\.old\\.bak\\.\\d+"));
        assertThat(dataFolderScriptFiles()).isEmpty();
        //The legacy driver must not stay registered, jdbc:h2: URLs belong to the bundled driver
        assertThat(java.util.Collections.list(DriverManager.getDrivers()))
            .noneMatch(driver -> driver.getClass().getName().startsWith("org.nzbhydra.h2legacy"));
    }

    /**
     * Makes the import fail deterministically by appending an invalid statement to the exported script and checks
     * that the original file is untouched and nothing is left behind.
     */
    @Test
    @EnabledIf("isOldH2JarAvailable")
    public void shouldLeaveOriginalUntouchedWhenImportFails() throws Exception {
        final File databaseFolder = tempDir.resolve("database").toFile();
        assertThat(databaseFolder.mkdirs()).isTrue();
        final File databaseFile = new File(databaseFolder, "nzbhydra.mv.db");
        final String dbConnectionUrl = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");
        createDatabaseWithOldH2(dbConnectionUrl, "create table t(id int primary key, v varchar); insert into t values (1,'a')");
        final byte[] originalContent = Files.readAllBytes(databaseFile.toPath());
        DatabaseRecreation.scriptPostProcessor = scriptFile -> {
            try {
                Files.writeString(scriptFile.toPath(), "\nINSERT INTO \"PUBLIC\".\"DOES_NOT_EXIST\" VALUES (1);\n", StandardCharsets.UTF_8, java.nio.file.StandardOpenOption.APPEND);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        };

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, dbConnectionUrl))
            .hasMessageContaining("DOES_NOT_EXIST");

        //The export opens the original with the old H2 which rewrites the MVStore header on close, so the bytes are
        //not identical. The content is: still a 2.1 file that the old engine opens and that contains the row.
        assertThat(databaseFile).exists();
        assertThat(DatabaseRecreation.detectFormat(DatabaseRecreation.readHeader(databaseFile))).isEqualTo(DatabaseFormat.H2_2_1);
        assertThat(DatabaseRecreation.detectFormat(new String(originalContent, StandardCharsets.ISO_8859_1))).isEqualTo(DatabaseFormat.H2_2_1);
        assertThat(queryWithOldH2(dbConnectionUrl, "select v from t where id = 1")).contains("a");
        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
        assertThat(dataFolderScriptFiles()).isEmpty();
    }

    static boolean isOldH2JarAvailable() {
        return OLD_H2_JAR.isFile();
    }

    /**
     * Runs the query with the 2.1.214 shell in a separate JVM and returns its output. Proves that the file written
     * by the relocated engine is still a valid stock H2 2.1 file.
     */
    private String queryWithOldH2(String dbConnectionUrl, String sql) throws Exception {
        final File output = tempDir.resolve("shell-output.txt").toFile();
        final Process process = new ProcessBuilder(javaExecutable(), "-cp", OLD_H2_JAR.getAbsolutePath(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-sql", sql)
            .redirectErrorStream(true)
            .redirectOutput(output)
            .start();
        assertThat(process.waitFor()).isEqualTo(0);
        final String result = Files.readString(output.toPath());
        assertThat(result).doesNotContain("Error");
        return result;
    }

    private void createDatabaseWithOldH2(String dbConnectionUrl, String sql) throws Exception {
        final Process process = new ProcessBuilder(javaExecutable(), "-cp", OLD_H2_JAR.getAbsolutePath(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-sql", sql)
            .redirectErrorStream(true)
            .inheritIO()
            .start();
        assertThat(process.waitFor()).isEqualTo(0);
    }

    /**
     * Only the test setup needs a java executable; the migration itself does not.
     */
    private static String javaExecutable() {
        return new File(System.getProperty("java.home"), "bin" + File.separator + (System.getProperty("os.name").toLowerCase().contains("win") ? "java.exe" : "java")).getAbsolutePath();
    }

    private File createFakeDatabaseFile(String header) throws IOException {
        final File databaseFolder = tempDir.resolve("database").toFile();
        assertThat(databaseFolder.mkdirs()).isTrue();
        final File databaseFile = new File(databaseFolder, "nzbhydra.mv.db");
        Files.write(databaseFile.toPath(), (header + "\n" + "x".repeat(2000)).getBytes(StandardCharsets.ISO_8859_1));
        return databaseFile;
    }

    private List<String> databaseFolderFiles() {
        final String[] files = tempDir.resolve("database").toFile().list();
        return files == null ? List.of() : Arrays.asList(files);
    }

    private List<String> dataFolderScriptFiles() {
        final String[] files = tempDir.toFile().list((dir, name) -> name.endsWith(".sql"));
        return files == null ? List.of() : Arrays.asList(files);
    }
}
