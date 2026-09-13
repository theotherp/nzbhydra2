package org.nzbhydra.migration;

import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import tools.jackson.databind.JsonNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Seeds a running NZBHydra instance of the <em>previous</em> code base (H2 2.1.x, database header {@code format:2})
 * with known data, shuts it down cleanly and copies its database file and configuration into the fixture folder that
 * {@code DatabaseMigrationSystemTest} later starts the <em>new</em> code base with. Next to the two files it writes
 * {@code expectations.json}, the record of what the test must find again after the migration.
 *
 * <p>Only endpoints that exist in the old code base are used: {@code /internalapi/config}, {@code /internalapi/search},
 * {@code /api}, {@code /getnzb/api/...}, {@code /internalapi/nzb/...}, {@code /internalapi/history/...},
 * {@code /internalapi/stats} and {@code /internalapi/control/shutdown}.
 *
 * <p>Usage (see {@code misc/create_migration_fixture.sh}):
 * <pre>
 * mvn -f tests/system/pom.xml -q compile exec:java -Dexec.mainClass=org.nzbhydra.migration.MigrationFixtureTool \
 *   -Dexec.args="--url http://127.0.0.1:5076 --apikey apikey --datafolder /path/to/data --mockserver http://127.0.0.1:5080"
 * </pre>
 *
 * <p>The instance reaches the mock server under {@code --mockserver}; the copied {@code nzbhydra.yml} gets
 * {@code --fixture-mockserver-url} (default {@code http://mockserver:5080}, the docker compose name) in its place, so
 * the fixture is usable in CI as it is and a local run only has to put its own URL back (see
 * {@code misc/run_migration_test.py}). The NZB links stored in the database keep the creation-time URL, which is why
 * the fixture uses {@code nzbAccessType=REDIRECT}: the migration test proves an old id still resolves by the redirect
 * target and fetches the NZB from the mock server URL it knows itself.
 */
public class MigrationFixtureTool {

    private static final MediaType JSON = MediaType.parse("application/json");
    private static final String[] INTERNAL_QUERIES = {"migrationInternalAlpha", "migrationInternalBeta", "migrationInternalGamma"};
    private static final String[] EXTERNAL_QUERIES = {"migrationExternalAlpha", "migrationExternalBeta", "migrationExternalGamma"};
    private static final String IMDB_ID = "0848228";
    private static final String TVMAZE_ID = "82";

    private final String baseUrl;
    private final String apiKey;
    private final String internalApiKey;
    private final Path dataFolder;
    private final String mockserverUrl;
    private final Path outputFolder;
    private final String fixtureMockserverUrl;
    private final OkHttpClient client = new OkHttpClient.Builder().readTimeout(60, TimeUnit.SECONDS).build();

    private MigrationFixtureTool(Map<String, String> args) {
        baseUrl = required(args, "url").replaceAll("/+$", "");
        apiKey = required(args, "apikey");
        internalApiKey = args.getOrDefault("internalapikey", "internalApiKey");
        dataFolder = Path.of(required(args, "datafolder"));
        mockserverUrl = required(args, "mockserver").replaceAll("/+$", "");
        outputFolder = Path.of(args.getOrDefault("out", "tests/system/instanceData/h2v2Migration"));
        fixtureMockserverUrl = args.getOrDefault("fixture-mockserver-url", "http://mockserver:5080").replaceAll("/+$", "");
    }

    public static void main(String[] argv) throws Exception {
        Map<String, String> args = new LinkedHashMap<>();
        for (int i = 0; i < argv.length; i++) {
            if (!argv[i].startsWith("--")) {
                throw new IllegalArgumentException("Unexpected argument " + argv[i]);
            }
            if (i + 1 >= argv.length) {
                throw new IllegalArgumentException("Missing value for " + argv[i]);
            }
            args.put(argv[i].substring(2), argv[++i]);
        }
        new MigrationFixtureTool(args).run();
    }

    private void run() throws Exception {
        if (!Files.isDirectory(dataFolder)) {
            throw new IllegalArgumentException("Data folder " + dataFolder + " does not exist");
        }
        log("Seeding instance at " + baseUrl + " (data folder " + dataFolder + ")");
        awaitHealthy();

        List<String> indexerNames = configureIndexersIfNeeded();
        Map<String, Object> expectations = new LinkedHashMap<>();
        expectations.put("createdAt", Instant.now().toString());
        expectations.put("apiKey", apiKey);
        expectations.put("mockserverUrl", fixtureMockserverUrl);
        expectations.put("indexers", indexerNames);

        log("Running searches");
        List<String> queries = runSearches();
        awaitSearchHistory(queries.size() + 2);
        List<Map<String, Object>> downloads = downloadNzbs();

        awaitDownloadHistory(downloads.size());
        JsonNode searchHistory = post("/internalapi/history/searches", historyRequest());
        JsonNode downloadHistory = post("/internalapi/history/downloads", historyRequest());

        Map<String, Object> searches = new LinkedHashMap<>();
        searches.put("count", searchHistory.path("totalElements").asInt());
        searches.put("queries", queries);
        // Every query in the history, newest first, duplicates included: the download step searches again.
        List<String> historyQueries = new ArrayList<>();
        List<Map<String, String>> identifiers = new ArrayList<>();
        for (JsonNode search : searchHistory.path("content")) {
            if (search.path("query").isString()) {
                historyQueries.add(search.path("query").asString());
            }
            for (JsonNode identifier : search.path("identifiers")) {
                Map<String, String> pair = new LinkedHashMap<>();
                pair.put("identifierKey", identifier.path("identifierKey").asString());
                pair.put("identifierValue", identifier.path("identifierValue").asString());
                identifiers.add(pair);
            }
        }
        searches.put("historyQueries", historyQueries);
        searches.put("identifiers", identifiers);
        expectations.put("searches", searches);

        List<Map<String, Object>> downloadEntries = new ArrayList<>();
        for (JsonNode entry : downloadHistory.path("content")) {
            Map<String, Object> download = new LinkedHashMap<>();
            download.put("title", entry.path("searchResult").path("title").asString());
            download.put("indexer", entry.path("searchResult").path("indexer").path("name").asString());
            download.put("searchResultId", entry.path("searchResult").path("id").asString());
            download.put("accessSource", entry.path("accessSource").asString());
            download.put("status", entry.path("status").asString());
            downloadEntries.add(download);
        }
        expectations.put("downloadHistory", downloadEntries);
        expectations.put("downloads", downloads);

        expectations.put("indexerApiAccesses", indexerApiAccesses());

        shutdownAndCopy(expectations);
    }

    private static String required(Map<String, String> args, String name) {
        String value = args.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required argument --" + name);
        }
        return value;
    }

    private void awaitHealthy() {
        await("instance to be healthy", 60, () -> {
            try (Response response = getRaw("/actuator/health/ping")) {
                return response.code() == 200;
            } catch (Exception e) {
                return false;
            }
        });
    }

    /**
     * Two mock newznab indexers, built the way {@code IndexerConfigurer} builds the system test baseline. The mock
     * server returns 20 results for API key {@code 1} and 10 for API key {@code 10}, which keeps the database small.
     */
    private List<String> configureIndexersIfNeeded() throws IOException {
        BaseConfig config = Jackson.JSON_MAPPER.readValue(getBody("/internalapi/config"), BaseConfig.class);
        boolean changed = false;
        if (config.getIndexers().isEmpty()) {
            log("No indexers configured - adding two mock newznab indexers pointing at " + mockserverUrl);
            config.getIndexers().add(mockIndexer("Mock1", "1"));
            config.getIndexers().add(mockIndexer("Mock2", "10"));
            changed = true;
        }
        if (!apiKey.equals(config.getMain().getApiKey())) {
            log("Setting main.apiKey to " + apiKey);
            config.getMain().setApiKey(apiKey);
            changed = true;
        }
        if (config.getDownloading().getNzbAccessType() != FileDownloadAccessType.REDIRECT) {
            log("Setting downloading.nzbAccessType to REDIRECT");
            config.getDownloading().setNzbAccessType(FileDownloadAccessType.REDIRECT);
            changed = true;
        }
        if (changed) {
            JsonNode result = put("/internalapi/config", config);
            if (!result.path("ok").asBoolean()) {
                throw new IllegalStateException("Writing the config failed: " + result);
            }
        }
        List<String> names = new ArrayList<>();
        for (IndexerConfig indexer : config.getIndexers()) {
            names.add(indexer.getName());
        }
        log("Indexers: " + names);
        return names;
    }

    private IndexerConfig mockIndexer(String name, String indexerApiKey) {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setApiKey(indexerApiKey);
        indexerConfig.setName(name);
        indexerConfig.setHost(mockserverUrl);
        indexerConfig.setAllCapsChecked(true);
        indexerConfig.setSupportedSearchIds(Arrays.asList(MediaIdType.IMDB, MediaIdType.TVMAZE));
        indexerConfig.setSupportedSearchTypes(Arrays.asList(ActionAttribute.SEARCH, ActionAttribute.TVSEARCH, ActionAttribute.MOVIE, ActionAttribute.BOOK));
        indexerConfig.setBackend(BackendType.NEWZNAB);
        IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
        categoryMapping.setAnime(9090);
        categoryMapping.setEbook(7020);
        categoryMapping.setCategories(List.of(new IndexerCategoryConfig.MainCategory(2000, "Movies", Collections.singletonList(new IndexerCategoryConfig.SubCategory(2030, "Movies HD")))));
        indexerConfig.setCategoryMapping(categoryMapping);
        return indexerConfig;
    }

    /**
     * Eight searches: three through the UI's search endpoint, three through the newznab API, one movie search by IMDB
     * id and one TV search by TVMaze id. Together they fill SEARCH, INDEXERSEARCH, SEARCHRESULT,
     * INDEXERSEARCHRESULTOCCURRENCE, INDEXERAPIACCESS(_SHORT) and IDENTIFIER_KEY_VALUE_PAIR.
     */
    private List<String> runSearches() throws IOException {
        List<String> queries = new ArrayList<>();
        for (String query : INTERNAL_QUERIES) {
            SearchRequestParameters parameters = new SearchRequestParameters();
            parameters.setQuery(query);
            log("Running search");
            JsonNode response = post("/internalapi/search", parameters);
            int results = response.path("searchResults").size();
            log("Internal search '" + query + "' returned " + results + " results");
            if (results == 0) {
                throw new IllegalStateException("Internal search returned no results");
            }
            queries.add(query);
        }
        for (String query : EXTERNAL_QUERIES) {
            NewznabXmlRoot root = externalApi("t=search", "q=" + query);
            int results = root.getRssChannel().getItems().size();
            log("External search '" + query + "' returned " + results + " results");
            if (results == 0) {
                throw new IllegalStateException("External search returned no results");
            }
            queries.add(query);
        }
        NewznabXmlRoot movie = externalApi("t=movie", "imdbid=" + IMDB_ID);
        log("External movie search for imdbid " + IMDB_ID + " returned " + movie.getRssChannel().getItems().size() + " results");
        NewznabXmlRoot tv = externalApi("t=tvsearch", "tvmazeid=" + TVMAZE_ID, "season=1", "ep=2");
        log("External TV search for tvmazeid " + TVMAZE_ID + " returned " + tv.getRssChannel().getItems().size() + " results");
        return queries;
    }

    /**
     * Three downloads: two through the API links of an external search, one through the UI's NZB endpoint. The
     * identifier in the links ({@code <searchResultId>.<searchId>}) is what the migration must keep resolvable.
     */
    private List<Map<String, Object>> downloadNzbs() throws IOException {
        List<Map<String, Object>> downloads = new ArrayList<>();
        NewznabXmlRoot root = externalApi("t=search", "q=" + EXTERNAL_QUERIES[0]);
        List<NewznabXmlItem> items = root.getRssChannel().getItems();
        for (int i = 0; i < 2; i++) {
            NewznabXmlItem item = items.get(i);
            String guid = item.getRssGuid().getGuid();
            String body = getBody(item.getLink());
            if (!body.contains("Would download NZB")) {
                throw new IllegalStateException("Unexpected NZB content for " + item.getLink() + ": " + body);
            }
            downloads.add(download(item.getTitle(), attribute(item, "hydraIndexerName"), guid, "API"));
            log("Downloaded '" + item.getTitle() + "' via " + item.getLink());
        }

        SearchRequestParameters parameters = new SearchRequestParameters();
        parameters.setQuery(INTERNAL_QUERIES[0]);
        JsonNode response = post("/internalapi/search", parameters);
        // The mock returns the same items for every query, so the first result is the one the API download above
        // already fetched. The last one is a different search result row.
        JsonNode results = response.path("searchResults");
        JsonNode result = results.get(results.size() - 1);
        String searchResultId = result.path("searchResultId").asString();
        String body = getBody("/internalapi/nzb/" + searchResultId);
        if (!body.contains("Would download NZB")) {
            throw new IllegalStateException("Unexpected NZB content from internal download of " + searchResultId + ": " + body);
        }
        downloads.add(download(result.path("title").asString(), result.path("indexer").asString(), searchResultId, "INTERNAL"));
        log("Downloaded '" + result.path("title").asString() + "' via /internalapi/nzb/" + searchResultId);
        return downloads;
    }

    private static Map<String, Object> download(String title, String indexer, String guid, String source) {
        Map<String, Object> download = new LinkedHashMap<>();
        download.put("title", title);
        download.put("indexer", indexer);
        download.put("guid", guid);
        download.put("searchResultId", guid.contains(".") ? guid.substring(0, guid.indexOf('.')) : guid);
        download.put("accessSource", source);
        return download;
    }

    private static String attribute(NewznabXmlItem item, String name) {
        for (NewznabAttribute attribute : item.getNewznabAttributes()) {
            if (name.equals(attribute.getName())) {
                return attribute.getValue();
            }
        }
        throw new IllegalStateException("Item " + item.getTitle() + " has no attribute " + name);
    }

    private void awaitSearchHistory(int expected) {
        await(expected + " searches in the history", 30, () -> {
            try {
                return post("/internalapi/history/searches", historyRequest()).path("totalElements").asInt() >= expected;
            } catch (Exception e) {
                return false;
            }
        });
    }

    private void awaitDownloadHistory(int expected) {
        await(expected + " downloads in the history", 30, () -> {
            try {
                return post("/internalapi/history/downloads", historyRequest()).path("totalElements").asInt() >= expected;
            } catch (Exception e) {
                return false;
            }
        });
    }

    private static HistoryRequest historyRequest() {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("time", 0));
        return request;
    }

    /**
     * The stats endpoint reports API accesses per indexer as averages and percentages, never as counts. What is
     * recorded is which indexers have an entry at all with a non-null success rate, which is only the case for
     * indexers that were accessed in the requested window.
     */
    private Map<String, Object> indexerApiAccesses() throws IOException {
        StatsRequest request = new StatsRequest();
        request.setAfter(Instant.now().minusSeconds(60 * 60 * 24));
        request.setBefore(Instant.now().plusSeconds(60 * 60 * 24));
        request.setIndexerApiAccessStats(true);
        JsonNode stats = post("/internalapi/stats", request);
        Map<String, Object> accesses = new LinkedHashMap<>();
        for (JsonNode entry : stats.path("indexerApiAccessStats")) {
            Map<String, Object> values = new LinkedHashMap<>();
            values.put("percentSuccessful", entry.path("percentSuccessful").isNumber() ? entry.path("percentSuccessful").asDouble() : null);
            values.put("averageAccessesPerDay", entry.path("averageAccessesPerDay").isNumber() ? entry.path("averageAccessesPerDay").asDouble() : null);
            accesses.put(entry.path("indexerName").asString(), values);
        }
        log("Indexer API access stats: " + accesses);
        return accesses;
    }

    private void shutdownAndCopy(Map<String, Object> expectations) throws Exception {
        Path databaseFile = dataFolder.resolve("database").resolve("nzbhydra.mv.db");
        Path configFile = dataFolder.resolve("nzbhydra.yml");
        Path lockFile = dataFolder.resolve("database").resolve("nzbhydra.lock.db");

        log("Shutting the instance down");
        getBody("/internalapi/control/shutdown");
        await("instance to stop answering", 60, () -> {
            try {
                getRaw("/actuator/health/ping").close();
                return false;
            } catch (IOException e) {
                return true;
            }
        });
        await("database lock file to disappear", 60, () -> !Files.exists(lockFile));
        // The file is closed (and compacted) a moment after the lock goes; give it a second to settle.
        Thread.sleep(2000);

        if (!Files.exists(databaseFile)) {
            throw new IllegalStateException("Database file " + databaseFile + " does not exist");
        }
        String header = readHeader(databaseFile);
        if (!header.contains("format:2")) {
            throw new IllegalStateException("Database header does not contain 'format:2' - is this really the old H2 2.1 code base? Header: " + header);
        }

        Files.createDirectories(outputFolder.resolve("database"));
        Path copiedDatabase = outputFolder.resolve("database").resolve("nzbhydra.mv.db");
        Path copiedConfig = outputFolder.resolve("nzbhydra.yml");
        Files.copy(databaseFile, copiedDatabase, StandardCopyOption.REPLACE_EXISTING);
        String yml = Files.readString(configFile);
        if (!yml.contains("\"" + mockserverUrl + "\"")) {
            throw new IllegalStateException("Expected the indexer host " + mockserverUrl + " in " + configFile);
        }
        Files.writeString(copiedConfig, yml.replace("\"" + mockserverUrl + "\"", "\"" + fixtureMockserverUrl + "\""));

        JsonNode yaml = Jackson.YAML_MAPPER.readTree(Files.readString(copiedConfig));
        Map<String, Object> config = new LinkedHashMap<>();
        // The file holds the key obfuscated; what must survive is that the plain key still works.
        config.put("main.apiKey", apiKey);
        List<String> configuredIndexers = new ArrayList<>();
        for (JsonNode indexer : yaml.path("indexers")) {
            configuredIndexers.add(indexer.path("name").asString());
        }
        config.put("indexers.name", configuredIndexers);
        config.put("downloading.nzbAccessType", yaml.path("downloading").path("nzbAccessType").asString());
        List<String> indexerHosts = new ArrayList<>();
        for (JsonNode indexer : yaml.path("indexers")) {
            indexerHosts.add(indexer.path("host").asString());
        }
        config.put("indexers.host", indexerHosts);
        expectations.put("config", config);

        Path expectationsFile = outputFolder.resolve("expectations.json");
        Files.writeString(expectationsFile, Jackson.JSON_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(expectations) + "\n");

        log("");
        log("Fixture written to " + outputFolder.toAbsolutePath());
        log("  " + copiedDatabase.getFileName() + ": " + Files.size(copiedDatabase) / 1024 + " KB, header contains format:2");
        log("  " + copiedConfig.getFileName() + ": " + Files.size(copiedConfig) / 1024 + " KB");
        log("  expectations.json: " + expectations.get("searches") + ", " + ((List<?>) expectations.get("downloads")).size() + " downloads, indexers " + expectations.get("indexers"));
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

    private NewznabXmlRoot externalApi(String... parameters) throws IOException {
        HttpUrl.Builder url = HttpUrl.get(baseUrl + "/api").newBuilder().addQueryParameter("apikey", apiKey);
        for (String parameter : parameters) {
            String[] split = parameter.split("=", 2);
            url.addQueryParameter(split[0], split[1]);
        }
        String body = getBody(url.build().toString());
        NewznabXmlRoot root = Jackson.getUnmarshal(body);
        if (root.getRssChannel() == null) {
            throw new IllegalStateException("Unexpected API response: " + body);
        }
        return root;
    }

    private JsonNode post(String endpoint, Object body) throws IOException {
        return Jackson.JSON_MAPPER.readTree(execute(new Request.Builder().url(url(endpoint)).post(RequestBody.create(Jackson.JSON_MAPPER.writeValueAsString(body), JSON)).build()));
    }

    private JsonNode put(String endpoint, Object body) throws IOException {
        return Jackson.JSON_MAPPER.readTree(execute(new Request.Builder().url(url(endpoint)).put(RequestBody.create(Jackson.JSON_MAPPER.writeValueAsString(body), JSON)).build()));
    }

    private String getBody(String endpoint) throws IOException {
        return execute(new Request.Builder().url(url(endpoint)).get().build());
    }

    private Response getRaw(String endpoint) throws IOException {
        return client.newCall(new Request.Builder().url(url(endpoint)).get().build()).execute();
    }

    private HttpUrl url(String endpoint) {
        HttpUrl.Builder builder;
        if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
            builder = HttpUrl.get(endpoint).newBuilder();
        } else {
            builder = HttpUrl.get(baseUrl + endpoint).newBuilder();
        }
        if (endpoint.contains("/internalapi/")) {
            builder.addQueryParameter("internalApiKey", internalApiKey);
        }
        return builder.build();
    }

    private String execute(Request request) throws IOException {
        try (Response response = client.newCall(request).execute(); ResponseBody body = response.body()) {
            String content = body == null ? "" : body.string();
            if (response.code() != 200) {
                throw new IllegalStateException("Call to " + request.url() + " failed with status " + response.code() + ": " + content);
            }
            return content;
        }
    }

    private static void await(String what, int seconds, Supplier<Boolean> condition) {
        long deadline = System.currentTimeMillis() + seconds * 1000L;
        while (System.currentTimeMillis() < deadline) {
            if (Boolean.TRUE.equals(condition.get())) {
                return;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while waiting for " + what);
            }
        }
        throw new IllegalStateException("Timed out after " + seconds + "s waiting for " + what);
    }

    private static void log(String message) {
        System.out.println(message);
    }
}
