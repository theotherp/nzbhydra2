package org.nzbhydra.downloading.downloaders.torbox;

import com.sun.net.httpserver.HttpServer;
import okhttp3.OkHttpClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.context.ApplicationEventPublisher;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * How {@link Torbox} reports responses which do not contain a usable download ID.
 */
class TorboxAddResponseTest {

    private HttpServer server;
    private final AtomicReference<String> responseBody = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> {
            exchange.getRequestBody().readAllBytes();
            String bodyString = responseBody.get();
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            if (bodyString == null) {
                exchange.sendResponseHeaders(200, -1);
            } else {
                byte[] response = bodyString.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            }
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    /**
     * A successful torrent add is answered with a hash and a torrent ID, not with a usenet download ID.
     * See https://github.com/TorBox-App/torbox-sdk-js/blob/main/documentation/services/TorrentsService.md
     * The hash is preferred because it cannot collide with the numeric IDs of the usenet entries we list.
     */
    @Test
    void shouldReturnTheHashForASuccessfulTorrentAdd() throws Exception {
        responseBody.set("{\"success\":true,\"error\":null,\"detail\":\"Torrent Added Successfully\",\"data\":{\"hash\":\"abc\",\"torrent_id\":123,\"auth_id\":\"auth\"}}");

        String downloadId = newInitializedTorbox().addContent("content".getBytes(StandardCharsets.UTF_8), "Some torrent", DownloadType.TORRENT, null);

        assertThat(downloadId).isEqualTo("abc");
    }

    @Test
    void shouldFallBackToTheTorrentIdWhenATorrentAddReturnsNoHash() throws Exception {
        responseBody.set("{\"success\":true,\"data\":{\"torrent_id\":123,\"auth_id\":\"auth\"}}");

        String downloadId = newInitializedTorbox().addContent("content".getBytes(StandardCharsets.UTF_8), "Some torrent", DownloadType.TORRENT, null);

        assertThat(downloadId).isEqualTo("123");
    }

    @Test
    void shouldReportAMissingDownloadIdInsteadOfReturningNull() {
        responseBody.set("{\"success\":true,\"data\":{\"hash\":\"abc\"}}");

        assertThatThrownBy(() -> newInitializedTorbox().addContent("content".getBytes(StandardCharsets.UTF_8), "Some NZB", DownloadType.NZB, null))
                .isInstanceOf(DownloaderException.class)
                .hasMessageContaining("did not return a download ID");
    }

    @Test
    void shouldReportMissingDataInsteadOfThrowingANullPointerException() {
        responseBody.set("{\"success\":true}");

        assertThatThrownBy(() -> newInitializedTorbox().addContent("content".getBytes(StandardCharsets.UTF_8), "Some NZB", DownloadType.NZB, null))
                .isInstanceOf(DownloaderException.class)
                .hasMessageContaining("did not return a download ID")
                .hasNoCause();
    }

    @Test
    void shouldReportAnEmptyResponse() {
        responseBody.set(null);

        assertThatThrownBy(() -> newInitializedTorbox().addContent("content".getBytes(StandardCharsets.UTF_8), "Some NZB", DownloadType.NZB, null))
                .isInstanceOf(DownloaderException.class)
                .hasMessageContaining("empty response");
    }

    @Test
    void shouldKeepTheErrorReportedByTorbox() {
        responseBody.set("{\"success\":false,\"error\":\"DOWNLOAD_LIMIT_REACHED\",\"detail\":\"Too many\"}");

        assertThatThrownBy(() -> newInitializedTorbox().addContent("content".getBytes(StandardCharsets.UTF_8), "Some NZB", DownloadType.NZB, null))
                .isInstanceOf(DownloaderException.class)
                .hasMessageContaining("DOWNLOAD_LIMIT_REACHED");
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
