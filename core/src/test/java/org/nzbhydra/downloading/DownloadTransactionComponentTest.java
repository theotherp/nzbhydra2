package org.nzbhydra.downloading;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import okhttp3.OkHttpClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.downloading.downloaders.AddNzbsResponse;
import org.nzbhydra.downloading.downloaders.Downloader;
import org.nzbhydra.downloading.downloaders.DownloaderInstatiator;
import org.nzbhydra.downloading.torrents.TorrentFileHandler;
import org.nzbhydra.indexers.IndexerApiAccessEntityShort;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;

/**
 * Runs the download paths against the real database and a local HTTP server standing in for the indexer and the
 * downloader. Checks that no database transaction (and so no pooled connection) is held while an NZB is fetched from
 * the indexer or uploaded to the downloader, and that the history rows are still written.
 */
@SpringBootTest(classes = NzbHydra.class)
class DownloadTransactionComponentTest {

    private static final String INDEXER_NAME = "transactionTestIndexer";
    private static final byte[] NZB_CONTENT = "<nzb>content</nzb>".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private FileHandler fileHandler;
    @Autowired
    private TorrentFileHandler torrentFileHandler;
    @Autowired
    private DownloaderInstatiator downloaderInstatiator;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private FileDownloadRepository downloadRepository;
    @Autowired
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Autowired
    private IndexerRepository indexerRepository;
    @MockitoSpyBean
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;

    /**
     * Request path to whether a transaction was active on the calling thread while the request was made.
     */
    private final Map<String, Boolean> transactionActiveByPath = new ConcurrentHashMap<>();
    private HttpServer server;
    private String baseUrl;
    private List<IndexerConfig> originalIndexers;
    private FileDownloadAccessType originalAccessType;

    @BeforeEach
    void setUp() throws IOException {
        deleteAllRows();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/nzb", exchange -> respond(exchange, 200, NZB_CONTENT));
        server.createContext("/broken", exchange -> respond(exchange, 500, "error".getBytes(StandardCharsets.UTF_8)));
        server.createContext("/api", exchange -> respond(exchange, 200, "{\"status\":true,\"nzo_ids\":[\"SABnzbd_nzo_1\"]}".getBytes(StandardCharsets.UTF_8)));
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();

        //Record on the calling thread (OkHttp runs interceptors there for synchronous calls) whether a transaction is open
        doAnswer(invocation -> ((OkHttpClient) invocation.callRealMethod()).newBuilder()
                .addInterceptor(chain -> {
                    transactionActiveByPath.put(chain.request().url().encodedPath(), TransactionSynchronizationManager.isActualTransactionActive());
                    return chain.proceed(chain.request());
                })
                .build())
                .when(requestFactory).getOkHttpClient(anyString(), any());

        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName(INDEXER_NAME);
        indexerConfig.setHost(baseUrl);
        indexerConfig.setApiKey("apikey");
        indexerConfig.setSearchModuleType(SearchModuleType.NEWZNAB);
        indexerConfig.setState(IndexerConfig.State.ENABLED);
        originalIndexers = new ArrayList<>(configProvider.getBaseConfig().getIndexers());
        configProvider.getBaseConfig().getIndexers().add(indexerConfig);
        searchModuleProvider.loadIndexers(configProvider.getBaseConfig().getIndexers());

        originalAccessType = configProvider.getBaseConfig().getDownloading().getNzbAccessType();
        configProvider.getBaseConfig().getDownloading().setNzbAccessType(FileDownloadAccessType.PROXY);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
        if (originalAccessType != null) {
            configProvider.getBaseConfig().getDownloading().setNzbAccessType(originalAccessType);
        }
        //Other test classes use the same in-memory database, so leave an empty one behind
        deleteAllRows();
        if (originalIndexers != null) {
            configProvider.getBaseConfig().getIndexers().clear();
            configProvider.getBaseConfig().getIndexers().addAll(originalIndexers);
            //After deleting the rows, so reloading recreates the entities of any configured indexers
            searchModuleProvider.loadIndexers(configProvider.getBaseConfig().getIndexers());
        }
    }

    private void deleteAllRows() {
        downloadRepository.deleteAll();
        shortRepository.deleteAll();
        searchResultRepository.deleteAll();
        indexerRepository.deleteAll();
    }

    @Test
    void shouldDownloadNzbOutsideOfTransactionAndRecordIt() {
        SearchResultEntity result = saveSearchResult("/nzb", DownloadType.NZB);

        DownloadResult downloadResult = fileHandler.getFileByResult(FileDownloadAccessType.PROXY, SearchSource.API, result);

        assertThat(downloadResult.isSuccessful()).isTrue();
        assertThat(downloadResult.getContent()).isEqualTo(NZB_CONTENT);
        assertThat(transactionActiveByPath).containsEntry("/nzb", false);
        assertThat(downloadRepository.findAll()).singleElement().satisfies(download -> {
            assertThat(download.getStatus()).isEqualTo(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
            assertThat(download.getAccessSource()).isEqualTo(SearchSource.API);
            assertThat(download.getSearchResult().getHash()).isEqualTo(result.getHash());
        });
        assertThat(shortRepository.findAll()).singleElement().extracting(IndexerApiAccessEntityShort::isSuccessful).isEqualTo(true);
    }

    @Test
    void shouldRecordFailedDownload() {
        SearchResultEntity result = saveSearchResult("/broken", DownloadType.NZB);

        DownloadResult downloadResult = fileHandler.getFileByResult(FileDownloadAccessType.PROXY, SearchSource.INTERNAL, result);

        assertThat(downloadResult.isSuccessful()).isFalse();
        assertThat(transactionActiveByPath).containsEntry("/broken", false);
        assertThat(downloadRepository.findAll()).singleElement().extracting(FileDownloadEntity::getStatus).isEqualTo(FileDownloadStatus.NZB_DOWNLOAD_ERROR);
        assertThat(shortRepository.findAll()).singleElement().extracting(IndexerApiAccessEntityShort::isSuccessful).isEqualTo(false);
    }

    @Test
    void shouldDownloadTorrentOutsideOfTransactionAndRecordIt() throws Exception {
        SearchResultEntity result = saveSearchResult("/nzb", DownloadType.TORRENT);

        DownloadResult downloadResult = torrentFileHandler.getTorrentByGuid(result.getHash(), FileDownloadAccessType.PROXY, SearchSource.INTERNAL);

        assertThat(downloadResult.isSuccessful()).isTrue();
        assertThat(transactionActiveByPath).containsEntry("/nzb", false);
        assertThat(downloadRepository.findAll()).singleElement().extracting(FileDownloadEntity::getStatus).isEqualTo(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    void shouldSendToDownloaderOutsideOfTransactionAndRecordIt() {
        SearchResultEntity result = saveSearchResult("/nzb", DownloadType.NZB);
        Downloader sabnzbd = downloaderInstatiator.instantiate(DownloaderType.SABNZBD);
        sabnzbd.initialize(DownloaderConfig.builder()
                .name("sabnzbd")
                .downloaderType(DownloaderType.SABNZBD)
                .url(baseUrl)
                .apiKey("apikey")
                .nzbAddingType(NzbAddingType.UPLOAD)
                .enabled(true)
                .build());

        AddNzbsResponse response = sabnzbd.addBySearchResultIds(List.of(new AddFilesRequest.SearchResult(String.valueOf(result.getHash()), null, null)), null);

        assertThat(response.isSuccessful()).isTrue();
        assertThat(transactionActiveByPath).containsEntry("/nzb", false).containsEntry("/api", false);
        assertThat(downloadRepository.findAll()).singleElement().satisfies(download -> {
            assertThat(download.getStatus()).isEqualTo(FileDownloadStatus.NZB_ADDED);
            assertThat(download.getExternalId()).isEqualTo("SABnzbd_nzo_1");
        });
    }

    private SearchResultEntity saveSearchResult(String path, DownloadType downloadType) {
        IndexerEntity indexer = indexerRepository.findByName(INDEXER_NAME);
        SearchResultEntity searchResult = new SearchResultEntity();
        searchResult.setIndexer(indexer);
        searchResult.setTitle("Some.Title");
        searchResult.setIndexerGuid("guid" + path);
        searchResult.setLink(baseUrl + path);
        searchResult.setDownloadType(downloadType);
        searchResult.setPubDate(Instant.now());
        searchResult.setFirstFound(Instant.now());
        return searchResultRepository.save(searchResult);
    }

    private static void respond(HttpExchange exchange, int status, byte[] body) throws IOException {
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(body);
        }
    }
}
