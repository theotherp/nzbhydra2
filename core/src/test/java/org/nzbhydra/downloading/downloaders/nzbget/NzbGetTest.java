package org.nzbhydra.downloading.downloaders.nzbget;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.googlecode.jsonrpc4j.JsonRpcHttpClient;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.webaccess.Ssl;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NzbGetTest {

    @Test
    void shouldOnlyReturnNzbGetCategoryNames() {
        NzbGet nzbGet = new NzbGet(null, null, null, null, null, null, null) {
            @Override
            protected ArrayList<LinkedHashMap<String, Object>> callNzbget(String listgroups, Object[] argument) throws DownloaderException {
                return new ArrayList<>(List.of(
                        configEntry("Category1.Name", "books"),
                        configEntry("Category1.DestDir", "/data/books/downloads"),
                        configEntry("Category2.Name", "movies"),
                        configEntry("SpeedControl:Category1.Name", "books"),
                        configEntry("WtfnzbRenamer:Category3.Name", "music"),
                        configEntry("Category.Name", "invalid")
                ));
            }
        };

        List<String> categories = nzbGet.getCategories();

        assertThat(categories).containsExactly("books", "movies");
    }

    @Test
    void shouldReturnUniqueCategoryNames() {
        NzbGet nzbGet = new NzbGet(null, null, null, null, null, null, null) {
            @Override
            protected ArrayList<LinkedHashMap<String, Object>> callNzbget(String listgroups, Object[] argument) throws DownloaderException {
                return new ArrayList<>(List.of(
                        configEntry("Category1.Name", "books"),
                        configEntry("Category2.Name", "movies"),
                        configEntry("Category3.Name", "books")
                ));
            }
        };

        List<String> categories = nzbGet.getCategories();

        assertThat(categories).containsExactly("books", "movies");
    }

    @Test
    void shouldInitializeJsonRpcClient() {
        Ssl ssl = mock(Ssl.class);
        when(ssl.getVerificationStateForHost("localhost")).thenReturn(Ssl.SslVerificationState.DISABLED_HOST);
        when(ssl.getAllTrustingSslContext()).thenReturn(null);
        DownloaderConfig config = new DownloaderConfig();
        config.setUrl("http://localhost/nzbget/");

        NzbGet nzbGet = new NzbGet(null, null, null, null, null, ssl, null);

        assertThatCode(() -> nzbGet.initialize(config)).doesNotThrowAnyException();
    }

    @Test
    void shouldSendUserAgentHeader() {
        Ssl ssl = mock(Ssl.class);
        when(ssl.getVerificationStateForHost("localhost")).thenReturn(Ssl.SslVerificationState.DISABLED_HOST);
        when(ssl.getAllTrustingSslContext()).thenReturn(null);
        DownloaderConfig config = new DownloaderConfig();
        config.setUrl("http://localhost/nzbget/");

        NzbGet nzbGet = new NzbGet(null, null, null, null, null, ssl, null);
        nzbGet.initialize(config);

        JsonRpcHttpClient client = (JsonRpcHttpClient) ReflectionTestUtils.getField(nzbGet, "client");
        assertThat(client.getHeaders()).containsEntry("User-Agent", "NZBHydra2");
    }

    @Test
    void shouldFallBackToOfflineStatusAndLogTheErrorOnlyOncePerThrottleWindow() throws Throwable {
        class FailingNzbGet extends NzbGet {
            FailingNzbGet() {
                super(null, null, null, null, null, null, null);
            }

            List<Long> recordedRates() {
                return getDownloadRates();
            }
        }
        FailingNzbGet failing = new FailingNzbGet();
        JsonRpcHttpClient client = mock(JsonRpcHttpClient.class);
        when(client.invoke(eq("status"), any(), eq(LinkedHashMap.class))).thenThrow(new IOException("downloader is offline"));
        ReflectionTestUtils.setField(failing, "client", client);
        ListAppender<ILoggingEvent> logAppender = new ListAppender<>();
        logAppender.start();
        Logger nzbGetLogger = (Logger) LoggerFactory.getLogger(NzbGet.class);
        nzbGetLogger.addAppender(logAppender);
        try {
            DownloaderStatus first = failing.getStatus();
            DownloaderStatus second = failing.getStatus();

            assertThat(first.getState()).isEqualTo(DownloaderStatus.State.OFFLINE);
            assertThat(second.getState()).isEqualTo(DownloaderStatus.State.OFFLINE);
            assertThat(failing.recordedRates()).containsExactly(0L, 0L);
            assertThat(logAppender.list.stream()
                    .filter(x -> x.getLevel() == Level.ERROR)
                    .filter(x -> "Error contacting NZBGet".equals(x.getMessage()))
                    .toList()).hasSize(1);
        } finally {
            nzbGetLogger.detachAppender(logAppender);
            logAppender.stop();
        }
    }

    private static LinkedHashMap<String, Object> configEntry(String name, String value) {
        LinkedHashMap<String, Object> entry = new LinkedHashMap<>();
        entry.put("Name", name);
        entry.put("Value", value);
        return entry;
    }

}
