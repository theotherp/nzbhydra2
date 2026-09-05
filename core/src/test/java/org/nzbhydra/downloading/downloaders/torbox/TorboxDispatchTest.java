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
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.context.ApplicationEventPublisher;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class TorboxDispatchTest {

    private HttpServer server;
    private final AtomicReference<String> requestPath = new AtomicReference<>();
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    private final AtomicReference<String> requestUserAgent = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/configured/torrents/createtorrent", exchange -> {
            requestPath.set(exchange.getRequestURI().getPath());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            requestUserAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            byte[] response = "{\"success\":true,\"data\":{\"usenetdownload_id\":\"torrent-123\"}}".getBytes(StandardCharsets.UTF_8);
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
    void shouldUseConfiguredUrlAndSendTitleAndCategory() throws Exception {
        Torbox torbox = newTorbox();
        torbox.initialize(DownloaderConfig.builder()
                .apiKey("test-key")
                .url("http://127.0.0.1:" + server.getAddress().getPort() + "/configured")
                .build());

        String downloadId = torbox.addContent("torrent-content".getBytes(StandardCharsets.UTF_8), "Torrent title", DownloadType.TORRENT, "movies");

        assertThat(downloadId).isEqualTo("torrent-123");
        assertThat(requestPath.get()).isEqualTo("/configured/torrents/createtorrent");
        assertThat(requestBody.get()).contains("name=\"name\"", "Torrent title", "name=\"category\"", "movies", "torrent-content");
        assertThat(requestUserAgent.get()).isEqualTo("NZBHydra2");
    }

    @Test
    void shouldUseDefaultUrlWhenNoUrlIsConfigured() {
        Torbox torbox = newTorbox();
        torbox.initialize(DownloaderConfig.builder().apiKey("test-key").build());

        assertThat(torbox.getBaseUrl().toUriString()).isEqualTo("https://api.torbox.app/v1/api");
    }

    private Torbox newTorbox() {
        TorboxHttpRequestFactory requestFactory = new TorboxHttpRequestFactory() {
            @Override
            public OkHttpClient getOkHttpClient(String host, Integer timeout) {
                return new OkHttpClient();
            }
        };
        return new Torbox(
                mock(FileHandler.class),
                mock(SearchResultRepository.class),
                mock(ApplicationEventPublisher.class),
                mock(IndexerSpecificDownloadExceptions.class),
                mock(ConfigProvider.class),
                mock(HydraOkHttp3ClientHttpRequestFactory.class),
                mock(DownloadUrlBuilder.class),
                requestFactory);
    }
}
