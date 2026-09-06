package org.nzbhydra.database;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class DatabaseRecreationTest {

    private static final String H2_1_4_HEADER = "H:2,blockSize:1000,created:1a076457bc1,format:1,fletcher:bd999d15";
    private static final String H2_2_1_HEADER = "H:2,block:30,blockSize:1000,chunk:c,clean:1,created:1a076449d10,format:2,version:c,fletcher:f3a7842a";
    private static final String H2_2_4_HEADER = "H:2,block:3,blockSize:1000,chunk:2,clean:1,created:1a07644a66c,format:3,version:2,fletcher:7a1d70de";

    private static final File OLD_H2_JAR = new File(System.getProperty("user.home"), ".m2/repository/com/h2database/h2/2.1.214/h2-2.1.214.jar");

    private static final DatabaseRecreation.JarSource ORIGINAL_JAR_SOURCE = DatabaseRecreation.jarSource;

    @TempDir
    Path tempDir;

    @BeforeEach
    public void setUp() {
        DatabaseRecreation.jarSource = (dataFolder, format) -> {
            throw new IllegalStateException("Jar download must not be called from tests");
        };
    }

    @AfterEach
    public void tearDown() {
        DatabaseRecreation.jarSource = ORIGINAL_JAR_SOURCE;
        DatabaseRecreation.javaExecutableSource = DatabaseRecreation::getJavaExecutable;
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
    public void shouldFindJavaInJavaHomeProperty() throws IOException {
        final File javaHome = createJavaHome("propertyHome");

        final Optional<String> executable = DatabaseRecreation.findJavaExecutable(javaHome.getAbsolutePath(), null, null, false);

        assertThat(executable).contains(new File(javaHome, "bin/java").getAbsolutePath());
    }

    @Test
    public void shouldFindJavaInJavaHomeEnvironmentVariable() throws IOException {
        final File javaHome = createJavaHome("envHome");

        final Optional<String> executable = DatabaseRecreation.findJavaExecutable(tempDir.resolve("doesNotExist").toString(), javaHome.getAbsolutePath(), null, false);

        assertThat(executable).contains(new File(javaHome, "bin/java").getAbsolutePath());
    }

    @Test
    public void shouldFindJavaOnPath() throws IOException {
        final File javaHome = createJavaHome("pathHome");
        final String path = tempDir.resolve("empty").toString() + File.pathSeparator + new File(javaHome, "bin").getAbsolutePath();

        final Optional<String> executable = DatabaseRecreation.findJavaExecutable(null, null, path, false);

        assertThat(executable).contains(new File(javaHome, "bin/java").getAbsolutePath());
    }

    @Test
    public void shouldLookForJavaExeOnWindows() throws IOException {
        final File javaHome = createJavaHome("windowsHome");
        Files.createFile(new File(javaHome, "bin/java.exe").toPath());

        assertThat(DatabaseRecreation.findJavaExecutable(javaHome.getAbsolutePath(), null, null, true)).contains(new File(javaHome, "bin/java.exe").getAbsolutePath());
        assertThat(DatabaseRecreation.findJavaExecutable(null, null, null, true)).isEmpty();
    }

    @Test
    public void shouldReturnEmptyWhenNoJavaIsFound() {
        assertThat(DatabaseRecreation.findJavaExecutable(null, null, null, false)).isEmpty();
        assertThat(DatabaseRecreation.findJavaExecutable(tempDir.resolve("nope").toString(), "", tempDir.resolve("nope").toString(), false)).isEmpty();
    }

    @Test
    public void shouldAbortBeforeTouchingFileWhenJavaIsMissing() throws Exception {
        final File databaseFile = createFakeDatabaseFile(H2_2_1_HEADER);
        final byte[] originalContent = Files.readAllBytes(databaseFile.toPath());
        DatabaseRecreation.javaExecutableSource = () -> {
            throw new IllegalStateException("needs a Java 17+ runtime");
        };

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("needs a Java 17+ runtime");

        assertThat(Files.readAllBytes(databaseFile.toPath())).isEqualTo(originalContent);
        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
        assertThat(dataFolderScriptFiles()).isEmpty();
    }

    @Test
    public void shouldAbortBeforeTouchingFileWhenDiskSpaceIsInsufficient() throws Exception {
        final File databaseFile = createFakeDatabaseFile(H2_2_1_HEADER);
        final byte[] originalContent = Files.readAllBytes(databaseFile.toPath());
        DatabaseRecreation.javaExecutableSource = () -> "java";
        DatabaseRecreation.usableSpaceSource = folder -> 0L;

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra")))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Not enough free disk space");

        assertThat(Files.readAllBytes(databaseFile.toPath())).isEqualTo(originalContent);
        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
        assertThat(dataFolderScriptFiles()).isEmpty();
    }

    @Test
    public void shouldFailOnUnknownFormatWithoutTouchingFile() throws Exception {
        final File databaseFile = createFakeDatabaseFile("H:2,blockSize:1000,format:99");
        DatabaseRecreation.javaExecutableSource = () -> {
            throw new AssertionError("Must not be called");
        };

        assertThatThrownBy(() -> DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra")))
            .hasMessageContaining("Invalid database file header");

        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
    }

    @Test
    public void shouldDoNothingForCurrentFormat() throws Exception {
        final File databaseFile = createFakeDatabaseFile(H2_2_4_HEADER);
        DatabaseRecreation.javaExecutableSource = () -> {
            throw new AssertionError("Must not be called");
        };

        DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, "jdbc:h2:file:" + tempDir.resolve("database/nzbhydra"));

        assertThat(databaseFolderFiles()).containsExactly("nzbhydra.mv.db");
    }

    @Test
    public void shouldUseLocalJarFromDataFolderInsteadOfDownloading() throws IOException {
        final File localJar = tempDir.resolve("h2-2.1.214.jar").toFile();
        Files.writeString(localJar.toPath(), "not really a jar");

        //The default source would try to download if the local file were not picked up
        final File jar = ORIGINAL_JAR_SOURCE.getJar(tempDir.toFile(), DatabaseFormat.H2_2_1);

        assertThat(jar).isEqualTo(localJar);
        assertThat(DatabaseFormat.H2_1_4.getJarFileName()).isEqualTo("h2-1.4.200.jar");
        assertThat(DatabaseFormat.H2_2_1.getJarFileName()).isEqualTo("h2-2.1.214.jar");
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
     * migration against it with the bundled H2 and checks the result. Skipped when the old jar is not available.
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
        DatabaseRecreation.jarSource = (dataFolder, format) -> {
            assertThat(format).isEqualTo(DatabaseFormat.H2_2_1);
            return OLD_H2_JAR;
        };

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
        DatabaseRecreation.jarSource = (dataFolder, format) -> OLD_H2_JAR;
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

    /**
     * Same for a 1.4.x database, using whatever 1.4 jar is in the local maven repository. Covers the password reset,
     * the FROM_1X import and the flyway baseline.
     */
    @Test
    @EnabledIf("isH2_1_4JarAvailable")
    public void shouldMigrate14DatabaseToCurrentVersion() throws Exception {
        final File oldJar = findH2_1_4Jar().orElseThrow();
        final File databaseFolder = tempDir.resolve("database").toFile();
        assertThat(databaseFolder.mkdirs()).isTrue();
        final File databaseFile = new File(databaseFolder, "nzbhydra.mv.db");
        final String dbConnectionUrl = "jdbc:h2:file:" + databaseFile.getAbsolutePath().replace(".mv.db", "");
        createDatabaseWithOldH2(oldJar, dbConnectionUrl, "create table t(id int primary key, v varchar); insert into t values (1,'a')");
        assertThat(DatabaseRecreation.detectFormat(DatabaseRecreation.readHeader(databaseFile))).isEqualTo(DatabaseFormat.H2_1_4);
        DatabaseRecreation.jarSource = (dataFolder, format) -> {
            assertThat(format).isEqualTo(DatabaseFormat.H2_1_4);
            return oldJar;
        };

        DatabaseRecreation.migrateIfNeeded(tempDir.toFile(), databaseFile, dbConnectionUrl);

        assertThat(DatabaseRecreation.detectFormat(DatabaseRecreation.readHeader(databaseFile))).isEqualTo(DatabaseFormat.CURRENT);
        try (Connection connection = DriverManager.getConnection(dbConnectionUrl, "sa", "sa"); Statement statement = connection.createStatement()) {
            try (ResultSet resultSet = statement.executeQuery("select v from t where id = 1")) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getString(1)).isEqualTo("a");
            }
            try (ResultSet resultSet = statement.executeQuery("select \"version\", \"description\" from \"flyway_schema_history\" where \"type\" = 'BASELINE'")) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getString(1)).isEqualTo("1");
                assertThat(resultSet.getString(2)).isEqualTo("INITIAL");
            }
        }
        assertThat(databaseFolderFiles()).anyMatch(name -> name.matches("nzbhydra\\.mv\\.db\\.old\\.bak\\.\\d+"));
        assertThat(dataFolderScriptFiles()).isEmpty();
    }

    static boolean isOldH2JarAvailable() {
        return OLD_H2_JAR.isFile();
    }

    static boolean isH2_1_4JarAvailable() {
        return findH2_1_4Jar().isPresent();
    }

    private static Optional<File> findH2_1_4Jar() {
        final File[] versionFolders = OLD_H2_JAR.getParentFile().getParentFile().listFiles((dir, name) -> name.startsWith("1.4."));
        if (versionFolders == null) {
            return Optional.empty();
        }
        return Arrays.stream(versionFolders)
            .map(folder -> new File(folder, "h2-" + folder.getName() + ".jar"))
            .filter(File::isFile)
            .findFirst();
    }

    private void createDatabaseWithOldH2(String dbConnectionUrl, String sql) throws Exception {
        createDatabaseWithOldH2(OLD_H2_JAR, dbConnectionUrl, sql);
    }

    /**
     * Runs the query with the 2.1.214 shell in a separate JVM and returns its output.
     */
    private String queryWithOldH2(String dbConnectionUrl, String sql) throws Exception {
        final File output = tempDir.resolve("shell-output.txt").toFile();
        final Process process = new ProcessBuilder(DatabaseRecreation.getJavaExecutable(), "-cp", OLD_H2_JAR.getAbsolutePath(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-sql", sql)
            .redirectErrorStream(true)
            .redirectOutput(output)
            .start();
        assertThat(process.waitFor()).isEqualTo(0);
        final String result = Files.readString(output.toPath());
        assertThat(result).doesNotContain("Error");
        return result;
    }

    private void createDatabaseWithOldH2(File oldJar, String dbConnectionUrl, String sql) throws Exception {
        final String javaExecutable = DatabaseRecreation.getJavaExecutable();
        final Process process = new ProcessBuilder(javaExecutable, "-cp", oldJar.getAbsolutePath(), "org.h2.tools.Shell", "-url", dbConnectionUrl, "-user", "sa", "-password", "sa", "-sql", sql)
            .redirectErrorStream(true)
            .inheritIO()
            .start();
        assertThat(process.waitFor()).isEqualTo(0);
    }

    private File createJavaHome(String name) throws IOException {
        final File bin = tempDir.resolve(name).resolve("bin").toFile();
        assertThat(bin.mkdirs()).isTrue();
        Files.createFile(new File(bin, "java").toPath());
        return bin.getParentFile();
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
