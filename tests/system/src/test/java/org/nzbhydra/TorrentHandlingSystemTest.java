package org.nzbhydra;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.downloading.SaveOrSendResultsResponse;
import org.nzbhydra.downloading.downloaders.AddNzbsResponse;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class TorrentHandlingSystemTest {

    private static final String INDEXER_NAME = "Deterministic Torznab";
    private static final String FILE_QUERY = "torrent-system-file";
    private static final String MAGNET_QUERY = "torrent-system-magnet";
    private static final String FILE_TITLE = "Hydra Deterministic Torrent File";
    private static final String MAGNET_TITLE = "Hydra Deterministic Magnet Link";
    private static final String TORRENT_CONTENT = "d4:infod4:name31:Hydra Deterministic Torrent Fileee";
    private static final String MAGNET_URI = "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Hydra+Deterministic+Magnet+Link";
    private static final String DOWNLOADER_NAME = "Deterministic Torbox";
    private static final String DOWNLOADER_CATEGORY = "Torrent System Category";

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    @Value("${blackholeFolder.nzbhydra}")
    private String blackholeFolderNzbhydra;

    @Value("${blackholeFolder.testaccess}")
    private String blackholeFolderTestAccess;

    private BaseConfig originalConfig;

    @BeforeEach
    public void setUp() throws IOException {
        originalConfig = configManager.getCurrentConfig();
        deleteBlackholeArtifacts();
        configureTorznabIndexer();
    }

    @AfterEach
    public void restoreConfigurationAndBlackhole() throws IOException {
        try {
            if (originalConfig != null) {
                assertSuccessfulSave(originalConfig);
            }
        } finally {
            deleteBlackholeArtifacts();
        }
    }

    @Test
    public void shouldReturnTorznabSearchResults() {
        HydraResponse response = hydraClient.get("/torznab/api", "apikey=apikey", "t=search", "q=" + FILE_QUERY);

        assertThat(response.status()).isEqualTo(200);
        NewznabXmlRoot root = Jackson.getUnmarshal(response.body());
        assertThat(root.getRssChannel().getItems()).isNotEmpty();
        assertThat(root.getRssChannel().getItems()).anySatisfy(item -> {
            assertThat(item.getTitle()).isEqualTo(FILE_TITLE);
            assertThat(item.getEnclosure()).isNotNull();
            assertThat(item.getEnclosure().getType()).isEqualTo("application/x-bittorrent");
            assertThat(item.getLink()).contains("/gettorrent/api/");
            assertThat(item.getTorznabAttributes()).anySatisfy(attribute -> {
                assertThat(attribute.getName()).isEqualTo("hydraIndexerName");
                assertThat(attribute.getValue()).isEqualTo(INDEXER_NAME);
            });
        });
    }

    @Test
    public void shouldDownloadTorrentFileByGuid() {
        String identifier = searchForIdentifier(FILE_QUERY, FILE_TITLE);

        HydraResponse response = hydraClient.get("/internalapi/torrent/" + identifier);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/x-bittorrent");
        assertThat(response.body()).isEqualTo(TORRENT_CONTENT);
    }

    @Test
    public void shouldReturnMagnetLinkByGuid() {
        String identifier = searchForIdentifier(MAGNET_QUERY, MAGNET_TITLE);

        HydraResponse response = hydraClient.getWithoutRedirects("/internalapi/torrent/" + identifier).dontRaiseIfUnsuccessful();

        assertThat(response.status()).isEqualTo(302);
        assertThat(response.header("Location")).isEqualTo(MAGNET_URI);
    }

    @Test
    public void shouldSaveTorrentToBlackhole() throws IOException {
        configureTorrentBlackhole();
        String identifier = searchForIdentifier(FILE_QUERY, FILE_TITLE);

        SaveOrSendResultsResponse response = hydraClient.put("/internalapi/saveOrSendTorrents", Set.of(identifier))
                .as(SaveOrSendResultsResponse.class);

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getAddedIds()).containsExactly(searchResultId(identifier));
        Path torrentFile = testAccessibleBlackhole().resolve(FILE_TITLE + ".torrent");
        try (Stream<Path> files = Files.list(testAccessibleBlackhole())) {
            assertThat(files.filter(file -> file.getFileName().toString().endsWith(".torrent")).toList()).containsExactly(torrentFile);
        }
        assertThat(Files.readString(torrentFile, StandardCharsets.UTF_8)).isEqualTo(TORRENT_CONTENT);
    }

    @Test
    public void shouldSendTorrentToConfiguredDownloader() {
        configureTorrentDownloader();
        String identifier = searchForIdentifier(FILE_QUERY, FILE_TITLE);
        AddFilesRequest request = new AddFilesRequest();
        request.setDownloaderName(DOWNLOADER_NAME);
        request.setCategory(DOWNLOADER_CATEGORY);
        request.setSearchResults(Collections.singletonList(new AddFilesRequest.SearchResult(identifier, "TV", DOWNLOADER_CATEGORY)));

        AddNzbsResponse response = hydraClient.put("/internalapi/downloader/addNzbs", request).as(AddNzbsResponse.class);
        Map<String, String> recordedRequest = hydraClient.getExternal(mockUrl + "/torbox/recording").as(new TypeReference<>() {
        });

        assertThat(response.isSuccessful()).isTrue();
        assertThat(recordedRequest).containsEntry("name", FILE_TITLE);
        assertThat(recordedRequest).containsEntry("category", DOWNLOADER_CATEGORY);
        assertThat(recordedRequest).containsEntry("file", TORRENT_CONTENT);
    }

    @Test
    public void shouldRejectInvalidTorrentIdentifier() {
        HydraResponse malformedInternal = hydraClient.get("/internalapi/torrent/not-a-torrent-identifier").dontRaiseIfUnsuccessful();
        HydraResponse missingInternal = hydraClient.get("/internalapi/torrent/999999999.1").dontRaiseIfUnsuccessful();
        HydraResponse malformedApi = hydraClient.get("/torznab/api", "apikey=apikey", "t=get", "id=not-a-torrent-identifier");
        HydraResponse missingApi = hydraClient.get("/torznab/api", "apikey=apikey", "t=get", "id=999999999.1");

        assertThat(malformedInternal.status()).isEqualTo(500);
        assertThat(missingInternal.status()).isEqualTo(500);
        assertThat(malformedApi.status()).isEqualTo(200);
        assertThat(missingApi.status()).isEqualTo(200);
        assertThat(malformedApi.body()).contains("<error", "code=\"300\"");
        assertThat(missingApi.body()).contains("<error", "code=\"300\"");
    }

    private void configureTorznabIndexer() {
        BaseConfig config = configManager.getCurrentConfig();
        IndexerConfig indexer = new IndexerConfig();
        indexer.setName(INDEXER_NAME);
        indexer.setHost(mockUrl);
        indexer.setApiPath("/torznab/api");
        indexer.setApiKey("deterministic-torznab-key");
        indexer.setBackend(BackendType.NEWZNAB);
        indexer.setSearchModuleType(SearchModuleType.TORZNAB);
        indexer.setAllCapsChecked(true);
        indexer.setSupportedSearchTypes(List.of(ActionAttribute.SEARCH));
        config.setIndexers(Collections.singletonList(indexer));
        assertSuccessfulSave(config);
    }

    private void configureTorrentBlackhole() {
        BaseConfig config = configManager.getCurrentConfig();
        config.getDownloading().setSaveTorrentsTo(Path.of(blackholeFolderNzbhydra).toAbsolutePath().toString());
        assertSuccessfulSave(config);
    }

    private void configureTorrentDownloader() {
        BaseConfig config = configManager.getCurrentConfig();
        DownloaderConfig downloader = new DownloaderConfig();
        downloader.setName(DOWNLOADER_NAME);
        downloader.setApiKey("deterministic-torbox-key");
        downloader.setUrl(mockUrl + "/torbox/v1/api");
        downloader.setDownloaderType(DownloaderType.TORBOX);
        downloader.setDownloadType(DownloadType.TORRENT);
        downloader.setEnabled(true);
        config.getDownloading().setDownloaders(Collections.singletonList(downloader));
        assertSuccessfulSave(config);
    }

    private String searchForIdentifier(String query, String title) {
        NewznabXmlRoot root = Jackson.getUnmarshal(hydraClient.get("/torznab/api", "apikey=apikey", "t=search", "q=" + query).body());
        return root.getRssChannel().getItems().stream()
                .filter(item -> title.equals(item.getTitle()))
                .map(NewznabXmlItem::getRssGuid)
                .map(guid -> guid.getGuid())
                .findFirst()
                .orElseThrow();
    }

    private long searchResultId(String identifier) {
        return Long.parseLong(identifier.substring(0, identifier.indexOf('.')));
    }

    private Path testAccessibleBlackhole() {
        return Path.of(blackholeFolderTestAccess);
    }

    private void deleteBlackholeArtifacts() throws IOException {
        Files.deleteIfExists(testAccessibleBlackhole().resolve(FILE_TITLE + ".torrent"));
        Files.deleteIfExists(testAccessibleBlackhole().resolve(MAGNET_TITLE + ".magnet"));
    }

    private void assertSuccessfulSave(BaseConfig config) {
        HydraResponse response = hydraClient.put("/internalapi/config", config);
        ConfigValidationResult validationResult = response.as(ConfigValidationResult.class);

        assertThat(response.status()).isEqualTo(200);
        assertThat(validationResult.isOk()).isTrue();
        assertThat(validationResult.getErrorMessages()).isEmpty();
        assertThat(validationResult.getNewConfig()).isNotNull();
    }
}
