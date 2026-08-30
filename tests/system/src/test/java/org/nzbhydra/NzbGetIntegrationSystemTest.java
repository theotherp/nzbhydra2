package org.nzbhydra;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.BackendType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.downloading.FileDownloadEntityTO;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.downloaders.AddNzbsResponse;
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.core.type.TypeReference;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SystemTest
public class NzbGetIntegrationSystemTest {

    private static final String DOWNLOADER_NAME = "Deterministic NZBGet";
    private static final String DOWNLOADER_CATEGORY = "NZBGet Deterministic Category";
    private static final String USERNAME = "nzbget-user";
    private static final String PASSWORD = "nzbget-password";
    private static final String NZB_TITLE = "Hydra NZBGet Integration NZB";
    private static final String NZB_CONTENT = "Would download NZB with IDnzbget-integration-1";
    private static final int NZB_ID = 4242;

    @Autowired
    private HydraClient hydraClient;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    @Value("${nzbhydra.mockUrl.external:http://127.0.0.1:5080}")
    private String mockUrlExternal;

    @BeforeEach
    public void setUp() {
        // BaselineExtension has already established the baseline; this only layers this class's downloader and indexer.
        resetMockserver();
        configureNzbGetAndIndexer();
    }

    @AfterEach
    public void resetMockserverRecording() {
        // The configuration this class layered on is re-established by BaselineExtension before the next test and
        // after this class; the mockserver recording is this class's own and nothing else clears it.
        resetMockserver();
    }

    @Test
    public void shouldCheckNzbGetConnection() {
        HydraResponse httpResponse = hydraClient.post("/internalapi/downloader/checkConnection", downloaderConfig());
        GenericResponse response = httpResponse.as(GenericResponse.class);
        Map<String, Object> call = recordedCall("writelog");

        assertThat(httpResponse.status()).isEqualTo(200);
        assertThat(response.isSuccessful()).isTrue();
        assertThat(call).containsEntry("httpMethod", "POST");
        assertThat(call).containsEntry("authorization", basicAuthorization());
        assertThat(parameters(call)).containsExactly("INFO", "NZBHydra 2 connected to test connection");
    }

    @Test
    public void shouldSendNzbToNzbGet() {
        String identifier = searchGuid();
        AddNzbsResponse response = sendToDownloader(identifier);
        Map<String, Object> call = recordedCall("append");
        List<Object> parameters = parameters(call);

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getAddedIds()).containsExactly(searchResultId(identifier));
        assertThat(parameters.get(0)).isEqualTo(NZB_TITLE + ".nzb");
        assertThat(Base64.getDecoder().decode((String) parameters.get(1))).isEqualTo(NZB_CONTENT.getBytes(StandardCharsets.UTF_8));
        assertThat(parameters.get(2)).isEqualTo(DOWNLOADER_CATEGORY);
        assertThat(parameters.get(3)).isEqualTo(0);
        assertThat(parameters.get(4)).isEqualTo(false);
        assertThat(parameters.get(5)).isEqualTo(true);
        assertThat(parameters.get(6)).isEqualTo("");
        assertThat(parameters.get(7)).isEqualTo(0);
        assertThat(parameters.get(8)).isEqualTo("SCORE");
        assertThat((List<?>) parameters.get(9)).isEmpty();

        Awaitility.await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(download(identifier).getExternalId()).isEqualTo(String.valueOf(NZB_ID)));
    }

    @Test
    public void shouldReadNzbGetQueueAndHistory() {
        selectState(Map.of("queueNzbId", NZB_ID, "nzbName", NZB_TITLE + ".nzb"));
        DownloaderStatus status = hydraClient.get("/internalapi/downloader/getStatus").as(DownloaderStatus.class);

        assertThat(status.getDownloaderName()).isEqualTo(DOWNLOADER_NAME);
        assertThat(status.getDownloaderType()).isEqualTo(DownloaderType.NZBGET);
        assertThat(status.getState()).isEqualTo(DownloaderStatus.State.DOWNLOADING);
        assertThat(status.getDownloadRateInKilobytes()).isEqualTo(20);
        assertThat(status.getRemainingSizeInMegaBytes()).isEqualTo(180);
        assertThat(status.getElementsInQueue()).isEqualTo(1);
        assertThat(status.getDownloadingTitle()).isEqualTo(NZB_TITLE + ".nzb");
        assertThat(status.getDownloadingTitlePercentFinished()).isEqualTo(50);
        assertThat(status.getDownloadingTitleRemainingTimeSeconds()).isEqualTo(2048);

        resetMockserver();
        String identifier = searchGuid();
        assertThat(sendToDownloader(identifier).isSuccessful()).isTrue();
        selectState(Map.of("queueNzbId", NZB_ID, "nzbName", NZB_TITLE + ".nzb"));
        runTask("Download queue check");
        Awaitility.await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
                assertThat(download(identifier).getStatus()).isEqualTo(FileDownloadStatus.NZB_ADDED));

        selectState(Map.of("historyNzbId", NZB_ID, "nzbName", NZB_TITLE + ".nzb"));
        runTask("Download history check");
        Awaitility.await().pollInterval(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            runTask("Download history check");
            assertThat(download(identifier).getStatus()).isEqualTo(FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        });
    }

    @Test
    public void shouldMapNzbGetErrorResponse() {
        selectState(Map.of("mode", "error"));
        GenericResponse connectionResponse = hydraClient.post("/internalapi/downloader/checkConnection", downloaderConfig())
                .as(GenericResponse.class);

        assertThat(connectionResponse.isSuccessful()).isFalse();
        assertThat(connectionResponse.getMessage()).isNotBlank();

        String identifier = searchGuid();
        AddNzbsResponse appendResponse = sendToDownloader(identifier);
        assertThat(appendResponse.isSuccessful()).isFalse();
        assertThat(appendResponse.getMissedIds()).containsExactly(searchResultId(identifier));
        assertThat(appendResponse.getAddedIds()).isEmpty();

        selectState(Map.of("mode", "malformed"));
        GenericResponse malformedResponse = hydraClient.post("/internalapi/downloader/checkConnection", downloaderConfig())
                .as(GenericResponse.class);
        assertThat(malformedResponse.isSuccessful()).isFalse();
        assertThat(malformedResponse.getMessage()).isNotBlank();
        assertThat(hydraClient.get("/internalapi/config").status()).isEqualTo(200);
    }

    private void configureNzbGetAndIndexer() {
        BaseConfig config = getConfig();
        config.getDownloading().setNzbAccessType(FileDownloadAccessType.PROXY);
        config.getDownloading().setUpdateStatuses(true);
        config.getDownloading().setDownloaders(Collections.singletonList(downloaderConfig()));
        config.getMain().setKeepHistory(true);
        config.setIndexers(Collections.singletonList(indexerConfig()));
        assertSuccessfulSave(config);
    }

    private DownloaderConfig downloaderConfig() {
        DownloaderConfig downloader = new DownloaderConfig();
        downloader.setName(DOWNLOADER_NAME);
        downloader.setUrl(mockUrl + "/nzbget/");
        downloader.setUsername(USERNAME);
        downloader.setPassword(PASSWORD);
        downloader.setDownloaderType(DownloaderType.NZBGET);
        downloader.setDownloadType(DownloadType.NZB);
        downloader.setNzbAddingType(NzbAddingType.UPLOAD);
        downloader.setAddPaused(true);
        downloader.setEnabled(true);
        return downloader;
    }

    private IndexerConfig indexerConfig() {
        IndexerConfig indexer = new IndexerConfig();
        indexer.setName("Deterministic NZBGet Indexer " + UUID.randomUUID());
        indexer.setHost(mockUrl);
        indexer.setApiPath("/api");
        indexer.setApiKey("deterministic-nzbget-indexer");
        indexer.setBackend(BackendType.NEWZNAB);
        indexer.setAllCapsChecked(true);
        indexer.setSupportedSearchTypes(List.of(ActionAttribute.SEARCH));
        return indexer;
    }

    private String searchGuid() {
        String marker = "nzbget-integration-" + UUID.randomUUID();
        NewznabXmlRoot root = Jackson.getUnmarshal(hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + marker).body());
        return root.getRssChannel().getItems().stream()
                .filter(item -> NZB_TITLE.equals(item.getTitle()))
                .map(NewznabXmlItem::getRssGuid)
                .map(guid -> guid.getGuid())
                .findFirst()
                .orElseThrow();
    }

    private AddNzbsResponse sendToDownloader(String identifier) {
        AddFilesRequest request = new AddFilesRequest();
        request.setDownloaderName(DOWNLOADER_NAME);
        request.setCategory(DOWNLOADER_CATEGORY);
        request.setSearchResults(Collections.singletonList(new AddFilesRequest.SearchResult(identifier, "Movies", DOWNLOADER_CATEGORY)));
        return hydraClient.put("/internalapi/downloader/addNzbs", request).as(AddNzbsResponse.class);
    }

    private FileDownloadEntityTO download(String identifier) {
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("time", 0));
        HydraPage<FileDownloadEntityTO> page = hydraClient.post("/internalapi/history/downloads", request).as(new TypeReference<>() {
        });
        return page.getContent().stream()
                .filter(download -> download.getSearchResult().getId() == searchResultId(identifier))
                .findFirst()
                .orElseThrow();
    }

    private void runTask(String taskName) {
        assertThat(hydraClient.put("/internalapi/tasks/" + taskName, Collections.emptyMap()).status()).isEqualTo(200);
    }

    private BaseConfig getConfig() {
        HydraResponse response = hydraClient.get("/internalapi/config");
        assertThat(response.status()).isEqualTo(200);
        return response.as(BaseConfig.class);
    }

    private void assertSuccessfulSave(BaseConfig config) {
        HydraResponse response = hydraClient.put("/internalapi/config", config);
        ConfigValidationResult validationResult = response.as(ConfigValidationResult.class);
        assertThat(response.status()).isEqualTo(200);
        assertThat(validationResult.isOk()).isTrue();
        assertThat(validationResult.getErrorMessages()).isEmpty();
        assertThat(validationResult.getNewConfig()).isNotNull();
    }

    private void resetMockserver() {
        assertThat(hydraClient.post(mockUrlExternal + "/nzbget/reset", Collections.emptyMap()).status()).isEqualTo(200);
    }

    private void selectState(Map<String, Object> state) {
        assertThat(hydraClient.post(mockUrlExternal + "/nzbget/state", state).status()).isEqualTo(200);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> recordedCall(String method) {
        return recordedCalls().stream().filter(call -> method.equals(call.get("method"))).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> recordedCalls() {
        Map<String, Object> recording = hydraClient.getExternal(mockUrlExternal + "/nzbget/recording").as(new TypeReference<>() {
        });
        return (List<Map<String, Object>>) recording.get("calls");
    }

    @SuppressWarnings("unchecked")
    private List<Object> parameters(Map<String, Object> call) {
        return (List<Object>) call.get("parameters");
    }

    private long searchResultId(String identifier) {
        return Long.parseLong(identifier.substring(0, identifier.indexOf('.')));
    }

    private String basicAuthorization() {
        return "Basic " + Base64.getEncoder().encodeToString((USERNAME + ":" + PASSWORD).getBytes(StandardCharsets.UTF_8));
    }
}
