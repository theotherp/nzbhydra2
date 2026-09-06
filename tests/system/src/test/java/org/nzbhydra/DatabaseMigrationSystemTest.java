package org.nzbhydra;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.FileDownloadEntityTO;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.StatsResponse;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.historystats.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.db.IdentifierKeyValuePairTO;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Runs against an instance of the <em>current</em> code base that was started with a copy of
 * {@code instanceData/h2v2Migration}: a data folder the previous code base (H2 2.1, database header {@code format:2})
 * wrote, seeded by {@link org.nzbhydra.migration.MigrationFixtureTool}. Starting it makes the core migrate the
 * database to H2 2.4 ({@code format:3}) and run the Flyway migration that moves the search result primary key from
 * the hash to a sequence. This class proves that what the fixture recorded in {@code expectations.json} survived.
 *
 * <p>Tagged {@code migration} and excluded from the normal suite by default (tests/system/pom.xml): it needs its own
 * instance, and it deliberately does not carry {@link SystemTest}, whose baseline would overwrite the indexers the
 * fixture is about. Select it with {@code -Dgroups=migration}; the CI job {@code runMigrationTestLinux} and
 * {@code misc/run_migration_test.py} do.
 *
 * <p>Properties: {@code migrationtest.datafolder} is the data folder the instance runs with, as this JVM sees it (the
 * log file and the database file are read from there); {@code migrationtest.mockserverExternalUrl} is where this JVM
 * reaches the mock server, needed because the NZB links stored in the fixture point at the creation-time URL.
 */
@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
@Tag("migration")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DatabaseMigrationSystemTest {

    private static final String FIXTURE = "h2v2Migration";
    private static final Pattern MIGRATION_LOG_LINE = Pattern.compile("(?i)(migrat(ing|ed)\\b.*(database|h2)|(database|h2).*migrat(ing|ed)\\b)");

    @Autowired
    private HydraClient hydraClient;
    @Autowired
    private ConfigManager configManager;

    @Value("${migrationtest.datafolder:}")
    private String dataFolderProperty;
    @Value("${migrationtest.mockserverExternalUrl:http://127.0.0.1:5080}")
    private String mockserverExternalUrl;

    private Path dataFolder;
    private JsonNode expectations;
    private String apiKey;

    @BeforeAll
    public void loadFixture() throws IOException {
        assertThat(dataFolderProperty)
            .withFailMessage("Set -Dmigrationtest.datafolder to the data folder the instance under test was started with")
            .isNotBlank();
        dataFolder = Path.of(dataFolderProperty);
        assertThat(dataFolder).isDirectory();

        File instanceData = DirectoryTreeUpTraversal.walkUpDirectoryTreeUntilFound(
            file -> file.isDirectory() && file.getName().equals("instanceData"), new File(System.getProperty("user.dir")));
        assertThat(instanceData).withFailMessage("No instanceData folder found above " + System.getProperty("user.dir")).isNotNull();
        Path expectationsFile = instanceData.toPath().resolve(FIXTURE).resolve("expectations.json");
        assertThat(expectationsFile).isRegularFile();
        expectations = Jackson.JSON_MAPPER.readTree(Files.readString(expectationsFile));
        apiKey = expectations.path("apiKey").asString();

        hydraClient.awaitHealthy();
    }

    @Test
    @Order(1)
    public void shouldHaveMigratedTheDatabaseFile() throws IOException {
        Path databaseFolder = dataFolder.resolve("database");
        Path databaseFile = databaseFolder.resolve("nzbhydra.mv.db");
        assertThat(databaseFile).isRegularFile();
        assertThat(readHeader(databaseFile))
            .withFailMessage("The database file was not migrated to H2 2.4: its header does not contain format:3")
            .contains("format:3");

        try (var files = Files.list(databaseFolder)) {
            List<String> backups = files.map(path -> path.getFileName().toString())
                .filter(name -> name.startsWith("nzbhydra.mv.db.old.bak."))
                .toList();
            assertThat(backups).withFailMessage("No backup of the old database file in " + databaseFolder).isNotEmpty();
        }
    }

    @Test
    @Order(2)
    public void shouldHaveLoggedTheMigrationWithoutErrors() throws IOException {
        Path logFile = dataFolder.resolve("logs").resolve("nzbhydra2.log");
        assertThat(logFile).isRegularFile();
        List<String> lines = Files.readAllLines(logFile, StandardCharsets.UTF_8);

        assertThat(lines).withFailMessage("No migration log line in " + logFile)
            .anyMatch(line -> MIGRATION_LOG_LINE.matcher(line).find());
        assertThat(lines).withFailMessage("The migration fell back to the backup")
            .noneMatch(line -> line.contains("Restoring database file"));
        assertThat(lines).withFailMessage("DatabaseRecreation logged an error")
            .noneMatch(line -> line.contains("ERROR") && line.contains("DatabaseRecreation"));
    }

    @Test
    @Order(3)
    public void shouldKeepTheSearchHistory() {
        HydraPage<SearchEntityTO> page = searchHistory();
        JsonNode searches = expectations.path("searches");

        assertThat(page.getTotalElements()).isEqualTo(searches.path("count").asInt());

        List<String> expectedQueries = strings(searches.path("historyQueries"));
        List<String> actualQueries = page.getContent().stream().map(SearchEntityTO::getQuery).filter(Objects::nonNull).toList();
        assertThat(actualQueries).containsExactlyElementsOf(expectedQueries);

        for (JsonNode identifier : searches.path("identifiers")) {
            IdentifierKeyValuePairTO expected = new IdentifierKeyValuePairTO(identifier.path("identifierKey").asString(), identifier.path("identifierValue").asString());
            assertThat(page.getContent())
                .withFailMessage("No search with identifier " + expected)
                .anyMatch(search -> search.getIdentifiers() != null && search.getIdentifiers().contains(expected));
        }
    }

    @Test
    @Order(4)
    public void shouldKeepTheDownloadHistory() {
        HydraPage<FileDownloadEntityTO> page = hydraClient.post("/internalapi/history/downloads", newestFirst())
            .as(new TypeReference<>() {
            });
        JsonNode expectedDownloads = expectations.path("downloadHistory");
        assertThat(page.getTotalElements()).isEqualTo(expectedDownloads.size());

        for (JsonNode expected : expectedDownloads) {
            String title = expected.path("title").asString();
            String indexer = expected.path("indexer").asString();
            String accessSource = expected.path("accessSource").asString();
            assertThat(page.getContent())
                .withFailMessage("No download of '%s' from %s via %s in the history", title, indexer, accessSource)
                .anyMatch(download -> download.getSearchResult() != null
                                      && title.equals(download.getSearchResult().getTitle())
                                      && download.getSearchResult().getIndexer() != null
                                      && indexer.equals(download.getSearchResult().getIndexer().getName())
                                      && accessSource.equals(String.valueOf(download.getAccessSource())));
        }
    }

    @Test
    @Order(5)
    public void shouldKeepIndexersAndConfig() {
        BaseConfig config = configManager.getCurrentConfig();
        List<String> indexerNames = config.getIndexers().stream().map(IndexerConfig::getName).toList();
        assertThat(indexerNames).containsExactlyElementsOf(strings(expectations.path("indexers")));
        assertThat(indexerNames).containsExactlyElementsOf(strings(expectations.path("config").path("indexers.name")));
        assertThat(String.valueOf(config.getDownloading().getNzbAccessType()))
            .isEqualTo(expectations.path("config").path("downloading.nzbAccessType").asString());
        // The API key is masked when read back; that the recorded key still opens the API is asserted by
        // shouldStillServeDownloadsByTheirOldIds and shouldPersistNewSearches.
    }

    @Test
    @Order(6)
    public void shouldKeepIndexerApiAccessStats() {
        StatsRequest request = new StatsRequest();
        request.setAfter(Instant.parse(expectations.path("createdAt").asString()).minus(Duration.ofDays(1)));
        request.setBefore(Instant.now().plus(Duration.ofDays(1)));
        request.setIndexerApiAccessStats(true);
        StatsResponse response = hydraClient.post("/internalapi/stats", request).as(StatsResponse.class);

        assertThat(response.getIndexerApiAccessStats()).isNotNull();
        for (String indexer : strings(expectations.path("indexers"))) {
            IndexerApiAccessStatsEntry entry = response.getIndexerApiAccessStats().stream()
                .filter(x -> indexer.equals(x.getIndexerName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No API access stats for indexer " + indexer));
            assertThat(entry.getPercentSuccessful()).withFailMessage("No recorded API accesses for " + indexer).isNotNull();
            assertThat(entry.getAverageAccessesPerDay()).isNotNull().isGreaterThan(0);
        }
    }

    /**
     * The identifiers in the download links the old code base handed out are the search results' hashes. After the
     * migration the hash is no longer the primary key, but the links must keep working: the Flyway migration maps
     * the hash to the new id and kept every result a download references.
     */
    @Test
    @Order(7)
    public void shouldStillServeDownloadsByTheirOldIds() {
        for (JsonNode download : expectations.path("downloads")) {
            String guid = download.path("guid").asString();
            String title = download.path("title").asString();
            HydraResponse response;
            if ("INTERNAL".equals(download.path("accessSource").asString())) {
                response = hydraClient.call("GET", "/internalapi/nzb/" + guid, java.util.Map.of(), null, false);
            } else {
                response = hydraClient.getWithoutRedirects("/getnzb/api/" + guid, "apikey=" + apiKey);
            }
            response.dontRaiseIfUnsuccessful();
            assertThat(response.getStatus())
                .withFailMessage("Download of '%s' by old id %s failed with status %s: %s", title, guid, response.getStatus(), response.getBody())
                .isIn(301, 302, 303, 307, 308);
            String location = response.header("Location");
            assertThat(location).withFailMessage("Download of '%s' by old id %s did not redirect to the indexer", title, guid).contains("/nzb/");

            // The stored link points at the mock server as the fixture's creator reached it; fetch it where this JVM does.
            URI stored = URI.create(location);
            String nzbUrl = mockserverExternalUrl.replaceAll("/+$", "") + stored.getRawPath() + (stored.getRawQuery() == null ? "" : "?" + stored.getRawQuery());
            assertThat(hydraClient.get(nzbUrl).body()).contains("Would download NZB");
        }
    }

    @Test
    @Order(8)
    public void shouldPersistNewSearchesAfterTheMigration() {
        int before = searchHistory().getTotalElements();
        String query = "migrationAfterUpgrade";

        NewznabXmlRoot root = Jackson.getUnmarshal(hydraClient.get("/api", "apikey=" + apiKey, "t=search", "q=" + query).body());
        assertThat(root.getRssChannel()).isNotNull();
        assertThat(root.getRssChannel().getItems()).isNotEmpty();

        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> {
            HydraPage<SearchEntityTO> page = searchHistory();
            assertThat(page.getTotalElements()).isEqualTo(before + 1);
            assertThat(page.getContent().get(0).getQuery()).isEqualTo(query);
        });
    }

    /**
     * TODO: the 1.4 fixture ({@code instanceData/v1Migration}) is not covered. Its migration downloads the H2 1.4 and
     * 2.1 jars from Maven Central at start-up and needs a second instance with its own data folder, mock server and
     * ports; {@code runMigrationTestLinux} starts one instance. Once a second compose service is worth its start-up
     * cost, start it with a copy of {@code v1Migration}, point {@code nzbhydra.port} at it and reuse the assertions
     * above with a fixture-specific {@code expectations.json}.
     */
    @Test
    @Disabled("The 1.4 fixture needs a second instance the CI job does not start yet; see the method comment")
    public void shouldMigrateFromV1() {
    }

    private HydraPage<SearchEntityTO> searchHistory() {
        return hydraClient.post("/internalapi/history/searches", newestFirst()).as(new TypeReference<>() {
        });
    }

    private static HistoryRequest newestFirst() {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("time", 0));
        return request;
    }

    private static List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        for (JsonNode value : array) {
            values.add(value.asString());
        }
        return values;
    }

    /**
     * The first kilobyte as text, the way {@code DatabaseRecreation} inspects the header.
     */
    private static String readHeader(Path databaseFile) throws IOException {
        byte[] bytes = new byte[1024];
        try (var stream = Files.newInputStream(databaseFile)) {
            int read = stream.read(bytes);
            return new String(bytes, 0, Math.max(read, 0), StandardCharsets.ISO_8859_1).trim();
        }
    }
}
