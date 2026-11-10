package org.nzbhydra.downloading.downloaders.torbox;

import com.sun.net.httpserver.HttpServer;
import okhttp3.OkHttpClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloaders.DownloaderEntry;
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.context.ApplicationEventPublisher;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * How {@link Torbox} reads the usenet list, which may contain null for numeric and boolean fields.
 */
class TorboxUsenetListTest {

    private HttpServer server;
    private final AtomicReference<String> responseBody = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> {
            exchange.getRequestBody().readAllBytes();
            byte[] response = responseBody.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void shouldReadEntriesWithNullPrimitiveFields() throws Exception {
        responseBody.set("""
            {"success":true,"error":null,"detail":"ok","data":[
              {"id":1,"name":"Complete","download_state":"completed","server":3,"eta":0,"progress":1.0,"size":100,
               "download_speed":0,"active":false,"files":[{"id":5,"name":"a.mkv","size":100,"zipped":false}]},
              {"id":2,"name":"Queued","download_state":"downloading","server":null,"eta":null,"progress":null,
               "size":null,"download_speed":null,"active":null,"cached":null,"download_present":null,
               "download_finished":null,"files":[{"id":null,"name":"b.mkv","size":null,"zipped":null,"infected":null}]}
            ]}""");
        Torbox torbox = newInitializedTorbox();

        List<DownloaderEntry> queue = torbox.getQueue(null);
        DownloaderStatus status = torbox.getStatus();

        assertThat(queue).extracting(DownloaderEntry::getNzbName).containsExactly("Queued");
        assertThat(status.getDownloadingTitle()).isEqualTo("Queued");
        assertThat(status.getDownloadingTitlePercentFinished()).isZero();
        assertThat(status.getDownloadRateInKilobytes()).isZero();
    }

    /**
     * Shape of a real response: finished downloads whose files were removed are "expired", older ones without a server.
     */
    @Test
    void shouldTreatExpiredDownloadsAsHistory() throws Exception {
        responseBody.set("""
            {"success":true,"error":null,"detail":"Usenet downloads list retrieved successfully.","data":[
              {"id":1,"created_at":"2026-04-13T11:36:53Z","name":"Newer","download_state":"expired","download_speed":0,
               "original_url":null,"eta":0,"progress":1,"size":6888410586,"active":false,"cached":false,
               "download_present":false,"download_finished":true,"expires_at":"2026-05-13T11:37:34Z","server":107,
               "alternative_hashes":["abc"],"tags":[],"airlocked":false},
              {"id":2,"created_at":"2025-09-14T11:32:55Z","name":"Older","download_state":"expired","download_speed":0,
               "original_url":"None","eta":0,"progress":1,"size":6466662656,"active":false,"cached":false,
               "download_present":false,"download_finished":true,"expires_at":"2025-10-22T02:21:07Z","server":null,
               "alternative_hashes":[],"tags":[],"airlocked":false}
            ]}""");
        Torbox torbox = newInitializedTorbox();

        assertThat(torbox.getQueue(null)).isEmpty();
        assertThat(torbox.getHistory(null)).extracting(DownloaderEntry::getNzbName).containsExactly("Newer", "Older");
        assertThat(torbox.getDownloadStatusFromDownloaderEntry(torbox.getHistory(null).get(1), null))
            .isEqualTo(FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    void shouldReadAResponseWithoutData() throws Exception {
        responseBody.set("{\"success\":true,\"data\":null}");

        assertThat(newInitializedTorbox().getQueue(null)).isEmpty();
    }

    private Torbox newInitializedTorbox() {
        TorboxHttpRequestFactory requestFactory = new TorboxHttpRequestFactory() {
            @Override
            public OkHttpClient getOkHttpClient(String host, Integer timeout) {
                return new OkHttpClient();
            }
        };
        Torbox torbox = new Torbox(
            mock(FileHandler.class),
            mock(SearchResultRepository.class),
            mock(ApplicationEventPublisher.class),
            mock(IndexerSpecificDownloadExceptions.class),
            mock(ConfigProvider.class),
            mock(HydraOkHttp3ClientHttpRequestFactory.class),
            mock(DownloadUrlBuilder.class),
            requestFactory);
        torbox.initialize(DownloaderConfig.builder()
            .apiKey("test-key")
            .url("http://127.0.0.1:" + server.getAddress().getPort() + "/configured")
            .build());
        return torbox;
    }
}
