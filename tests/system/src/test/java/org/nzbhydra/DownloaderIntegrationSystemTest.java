package org.nzbhydra;

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
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.downloading.DuplicateMovieDownloadCheckResponse;
import org.nzbhydra.downloading.downloaders.AddNzbsResponse;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.SearchResponse;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.core.type.TypeReference;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SystemTest
public class DownloaderIntegrationSystemTest {

    private static final String DOWNLOADER_NAME = "Deterministic SABnzbd";
    private static final String DOWNLOADER_CATEGORY = "Deterministic Category";
    private static final String API_KEY = "deterministic-sabnzbd-key";
    private static final String INVALID_API_KEY = "mock-invalid-api-key";
    private static final String UNAVAILABLE_API_KEY = "mock-unavailable-api-key";
    private static final String NZB_QUERY = "downloader-integration-nzb";
    private static final String NZB_TITLE = "Hydra Downloader Integration NZB";
    private static final String NZB_CONTENT = "Would download NZB with IDdownloader-integration-1";
    private static final String MOVIE_TMDB_ID = "424242";
    private static final String MOVIE_TITLE = "Hydra Downloader Integration Movie";

    @Autowired
    private HydraClient hydraClient;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    @Value("${nzbhydra.mockUrl.external:http://127.0.0.1:5080}")
    private String mockUrlExternal;

    @BeforeEach
    public void setUp() {
        // BaselineExtension has already established the baseline; this only layers what is specific to this class.
        resetMockserverRecording();
        configureDeterministicDownloaderAndIndexer();
    }

    @AfterEach
    public void resetRecording() {
        // The configuration this class layered on is re-established by BaselineExtension before the next test and
        // after this class; the mockserver recording is this class's own and nothing else clears it.
        resetMockserverRecording();
    }

    @Test
    public void shouldSendExpectedNzbContentNameCategoryAndPriority() {
        String identifier = searchGuid(NZB_QUERY);
        AddNzbsResponse response = sendToDownloader(identifier, DOWNLOADER_CATEGORY, null);
        Map<String, Object> recording = getRecording();
        Map<String, Object> queryParameters = map(recording, "queryParameters");

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getAddedIds()).containsExactly(searchResultId(identifier));
        assertThat(queryParameters).containsEntry("mode", "addfile");
        assertThat(queryParameters).containsEntry("nzbname", NZB_TITLE + ".nzb");
        assertThat(queryParameters).containsEntry("cat", DOWNLOADER_CATEGORY);
        assertThat(queryParameters).containsEntry("priority", "-2");
        assertThat(recording).containsEntry("multipartFilename", NZB_TITLE + ".nzb");
        assertThat(recording).containsEntry("multipartContent", NZB_CONTENT);
        assertThat(recording).containsEntry("apiKey", API_KEY);
        assertThat(recording).containsEntry("method", "POST");
    }

    @Test
    public void shouldReportDownloaderAuthenticationFailure() {
        HydraResponse httpResponse = hydraClient.post("/internalapi/downloader/checkConnection", downloaderConfig(INVALID_API_KEY));
        GenericResponse response = httpResponse.as(GenericResponse.class);

        assertThat(httpResponse.status()).isEqualTo(200);
        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).containsIgnoringCase("authentication failed");
    }

    @Test
    public void shouldReportUnavailableDownloader() {
        HydraResponse httpResponse = hydraClient.post("/internalapi/downloader/checkConnection", downloaderConfig(UNAVAILABLE_API_KEY));
        GenericResponse response = httpResponse.as(GenericResponse.class);

        assertThat(httpResponse.status()).isEqualTo(200);
        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).isNotBlank();
        assertThat(response.getMessage()).containsIgnoringCase("unavailable");
        assertThat(hydraClient.get("/internalapi/config").status()).isEqualTo(200);
    }

    @Test
    public void shouldReturnConfiguredDownloaderCategories() {
        HydraResponse httpResponse = hydraClient.get("/internalapi/downloader/" + DOWNLOADER_NAME + "/categories");
        List<String> categories = httpResponse.as(new TypeReference<>() {
        });

        assertThat(httpResponse.status()).isEqualTo(200);
        assertThat(categories).containsExactly("*", "movies", "series", "tv");
    }

    @Test
    public void shouldRequireReasonForDuplicateMovieDownload() {
        String firstIdentifier = searchMovieGuid();
        AddFilesRequest firstRequest = addRequest(firstIdentifier, "Movies", null);

        assertThat(hydraClient.put("/internalapi/downloader/checkDuplicateMovieDownload", firstRequest)
                .as(DuplicateMovieDownloadCheckResponse.class).isReasonRequired()).isFalse();
        assertThat(hydraClient.put("/internalapi/downloader/addNzbs", firstRequest).as(AddNzbsResponse.class).isSuccessful()).isTrue();

        String followUpIdentifier = searchMovieGuid();
        AddFilesRequest followUpRequest = addRequest(followUpIdentifier, "Movies", "duplicate-reason-" + UUID.randomUUID());
        assertThat(hydraClient.put("/internalapi/downloader/checkDuplicateMovieDownload", followUpRequest)
                .as(DuplicateMovieDownloadCheckResponse.class).isReasonRequired()).isTrue();

        AddNzbsResponse followUpResponse = hydraClient.put("/internalapi/downloader/addNzbs", followUpRequest).as(AddNzbsResponse.class);
        assertThat(followUpResponse.isSuccessful()).isTrue();
        assertThat(getRecording()).containsEntry("multipartFilename", MOVIE_TITLE + ".nzb");
    }

    private void configureDeterministicDownloaderAndIndexer() {
        BaseConfig config = getConfig();
        config.getDownloading().setNzbAccessType(FileDownloadAccessType.PROXY);
        config.getDownloading().setDownloaders(Collections.singletonList(downloaderConfig(API_KEY)));
        config.setIndexers(Collections.singletonList(indexerConfig()));
        assertSuccessfulSave(config);
    }

    private DownloaderConfig downloaderConfig(String apiKey) {
        DownloaderConfig downloader = new DownloaderConfig();
        downloader.setName(DOWNLOADER_NAME);
        downloader.setApiKey(apiKey);
        downloader.setUrl(mockUrl + "/sabnzbd");
        downloader.setDownloaderType(DownloaderType.SABNZBD);
        downloader.setDownloadType(DownloadType.NZB);
        downloader.setNzbAddingType(NzbAddingType.UPLOAD);
        downloader.setAddPaused(true);
        downloader.setEnabled(true);
        return downloader;
    }

    private IndexerConfig indexerConfig() {
        IndexerConfig indexer = new IndexerConfig();
        indexer.setName("Deterministic Downloader Indexer");
        indexer.setHost(mockUrl);
        indexer.setApiPath("/api");
        indexer.setApiKey("deterministic-downloader-indexer");
        indexer.setBackend(BackendType.NEWZNAB);
        indexer.setAllCapsChecked(true);
        indexer.setSupportedSearchTypes(List.of(ActionAttribute.SEARCH, ActionAttribute.MOVIE));
        indexer.setSupportedSearchIds(List.of(MediaIdType.TMDB));
        return indexer;
    }

    private String searchGuid(String query) {
        NewznabXmlRoot root = Jackson.getUnmarshal(hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + query).body());
        return root.getRssChannel().getItems().stream()
                .filter(item -> NZB_TITLE.equals(item.getTitle()))
                .map(NewznabXmlItem::getRssGuid)
                .map(guid -> guid.getGuid())
                .findFirst()
                .orElseThrow();
    }

    private String searchMovieGuid() {
        SearchRequestParameters parameters = new SearchRequestParameters();
        parameters.setCategory("Movies");
        parameters.setMode("MOVIE");
        parameters.setTmdbId(MOVIE_TMDB_ID);
        SearchResponse response = hydraClient.post("/internalapi/search", parameters).as(SearchResponse.class);
        String identifier = response.getSearchResults().stream()
                .filter(item -> MOVIE_TITLE.equals(item.getTitle()))
                .map(item -> item.getDownloadId())
                .findFirst()
                .orElseThrow();
        assertThat(identifier).contains(".");
        return identifier;
    }

    private AddNzbsResponse sendToDownloader(String identifier, String category, String reason) {
        return hydraClient.put("/internalapi/downloader/addNzbs", addRequest(identifier, category, reason)).as(AddNzbsResponse.class);
    }

    private AddFilesRequest addRequest(String identifier, String category, String reason) {
        AddFilesRequest request = new AddFilesRequest();
        request.setDownloaderName(DOWNLOADER_NAME);
        request.setCategory(category);
        request.setReason(reason);
        request.setSearchResults(Collections.singletonList(new AddFilesRequest.SearchResult(identifier, "Movies", category)));
        return request;
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

    private void resetMockserverRecording() {
        assertThat(hydraClient.post(mockUrlExternal + "/sabnzbd/recording/reset", Collections.emptyMap()).status()).isEqualTo(200);
    }

    private Map<String, Object> getRecording() {
        return hydraClient.getExternal(mockUrlExternal + "/sabnzbd/recording").as(new TypeReference<>() {
        });
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Map<String, Object> recording, String key) {
        return (Map<String, Object>) recording.get(key);
    }

    private long searchResultId(String identifier) {
        return Long.parseLong(identifier.substring(0, identifier.indexOf('.')));
    }
}
