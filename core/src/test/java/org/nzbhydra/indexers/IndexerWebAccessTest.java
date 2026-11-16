package org.nzbhydra.indexers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.webaccess.WebAccess;
import org.nzbhydra.webaccess.WebAccessException;
import org.slf4j.MDC;
import org.springframework.oxm.Unmarshaller;
import org.springframework.oxm.UnmarshallingFailureException;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.data.MapEntry.entry;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class IndexerWebAccessTest {

    @Mock
    private SearchingConfig searchingConfigMock;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private WebAccess webAccessMock;
    private IndexerConfig indexerConfig = new IndexerConfig();
    @Mock
    private Unmarshaller unmarshallerMock;
    @Mock
    private UpdateManager updateManager;
    @Captor
    ArgumentCaptor<Map<String, String>> headersCaptor;
    @Captor
    ArgumentCaptor<Integer> timeoutCaptor;
    @Captor
    ArgumentCaptor<Duration> callTimeoutCaptor;

    @InjectMocks
    private IndexerWebAccess testee = new IndexerWebAccess();

    @BeforeEach
    public void setUp() throws Exception {

        String xml = """
                <?xml version="1.0" ?>
                <metadata>
                </metadata>""";
        when(webAccessMock.callUrl(anyString(), headersCaptor.capture(), timeoutCaptor.capture(), callTimeoutCaptor.capture())).thenReturn(xml);
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.setSearching(searchingConfigMock);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        when(searchingConfigMock.getUserAgent()).thenReturn(Optional.of("globalUa"));
        when(searchingConfigMock.getTimeout()).thenReturn(100);
        indexerConfig.setTimeout(10);
        indexerConfig.setUserAgent("indexerUa");
        when(unmarshallerMock.unmarshal(any())).thenReturn(new NewznabXmlRoot());
    }

    @Test
    void shouldUseIndexerUserAgent() throws Exception {
        testee.get(new URI("http://127.0.0.1"), indexerConfig);
        Map<String, String> headers = headersCaptor.getValue();
        assertThat(headers).contains(entry("User-Agent", "indexerUa"));
    }

    @Test
    void shouldUseGlobalUserAgentIfNoIndexerUaIsSet() throws Exception {
        indexerConfig.setUserAgent(null);

        testee.get(new URI("http://127.0.0.1"), indexerConfig);

        Map<String, String> headers = headersCaptor.getValue();
        assertThat(headers).contains(entry("User-Agent", "globalUa"));
    }

    @Test
    void shouldIncludeVersionInDefaultUa() throws Exception {
        indexerConfig.setUserAgent(null);
        when(searchingConfigMock.getUserAgent()).thenReturn(Optional.empty());
        when(updateManager.getCurrentVersionString()).thenReturn("1.2.3");

        testee.get(new URI("http://127.0.0.1"), indexerConfig);

        Map<String, String> headers = headersCaptor.getValue();
        assertThat(headers).contains(entry("User-Agent", "NZBHydra2 1.2.3"));
    }

    @Test
    void shouldIncludeVersionInCongiguredNzbhydra2Ua() throws Exception {
        indexerConfig.setUserAgent(null);
        when(searchingConfigMock.getUserAgent()).thenReturn(Optional.of("NZBHydra2"));
        when(updateManager.getCurrentVersionString()).thenReturn("1.2.3");

        testee.get(new URI("http://127.0.0.1"), indexerConfig);

        Map<String, String> headers = headersCaptor.getValue();
        assertThat(headers).contains(entry("User-Agent", "NZBHydra2 1.2.3"));
    }

    @Test
    void shouldUseIndexerTimeout() throws Exception {
        testee.get(new URI("http://127.0.0.1"), indexerConfig);
        assertThat(timeoutCaptor.getValue()).isEqualTo(10);
    }

    @Test
    void shouldUseGlobalTimeoutNoIndexerTimeoutIsSet() throws Exception {
        indexerConfig.setTimeout(null);

        testee.get(new URI("http://127.0.0.1"), indexerConfig);

        assertThat(timeoutCaptor.getValue()).isEqualTo(100);
    }

    /**
     * ADR-0019: the message built here reaches the connection-check dialog, the per-indexer search-result error and
     * the stored {@code IndexerConfig.lastError}, so it must carry the response message and code but not the body.
     * The original {@link WebAccessException} must still be the cause so {@code IndexerChecker} can read the body.
     */
    @Test
    void shouldNotIncludeResponseBodyInUnreachableMessage() throws Exception {
        indexerConfig.setName("testindexer");
        WebAccessException webAccessException = new WebAccessException("Bad Request", "<error code=\"100\" description=\"Incorrect parameter\"/>", 400);
        when(webAccessMock.callUrl(anyString(), headersCaptor.capture(), timeoutCaptor.capture(), callTimeoutCaptor.capture())).thenThrow(webAccessException);

        assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                .isInstanceOf(IndexerUnreachableException.class)
                .hasMessage("Error while communicating with indexer testindexer. Server returned: Bad Request. Code: 400")
                .matches(t -> !t.getMessage().contains("<"), "message contains no markup from the response body")
                .matches(t -> t.getCause() == webAccessException, "cause is the original WebAccessException instance");
    }

    @Test
    void shouldBoundWholeCallWithOneSecondMoreThanTimeout() throws Exception {
        testee.get(new URI("http://127.0.0.1"), indexerConfig);

        assertThat(callTimeoutCaptor.getValue()).isEqualTo(Duration.ofSeconds(11));
    }

    /**
     * The call used to run in a thread pool built for every call, which waited one second more than the timeout
     * and, when that ran out, interrupted the call and reported it as not completed in time. The call timeout now
     * bounds the whole call in OkHttp, which ends it with an {@link InterruptedIOException} that must produce the same
     * message. The call runs on the calling thread, so no thread is left behind.
     */
    @Test
    void shouldReportCallTimeoutAsNotCompletedInTime() throws Exception {
        indexerConfig.setTimeout(0);
        AtomicReference<Thread> callingThread = new AtomicReference<>();
        when(webAccessMock.callUrl(anyString(), any(), anyInt(), any())).thenAnswer(invocation -> {
            callingThread.set(Thread.currentThread());
            throw new InterruptedIOException("timeout");
        });

        assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                .isInstanceOf(IndexerUnreachableException.class)
                .hasMessage("Indexer did not complete request within 0 seconds");
        assertThat(callingThread.get()).as("Call runs on the calling thread").isSameAs(Thread.currentThread());
    }

    @Test
    void shouldReportSocketTimeoutAsTimedOutConnection() throws Exception {
        when(webAccessMock.callUrl(anyString(), any(), anyInt(), any())).thenThrow(new SocketTimeoutException("Read timed out"));

        assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                .isInstanceOf(IndexerUnreachableException.class)
                .hasMessage("Connection with indexer timed out with a time out of 10 seconds: Read timed out");
    }

    @Test
    void shouldReportUnparseableResponse() throws Exception {
        when(unmarshallerMock.unmarshal(any())).thenThrow(new UnmarshallingFailureException("broken xml"));

        assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                .isExactlyInstanceOf(IndexerAccessException.class)
                .hasMessageStartingWith("Unable to parse indexer output: Message: broken xml")
                .hasCauseInstanceOf(IndexerWebAccess.HydraUnmarshallingFailureException.class);
    }

    @Test
    void shouldReportOtherErrorsWithServerMessage() throws Exception {
        indexerConfig.setName("testindexer");
        IOException ioException = new IOException("Connection reset");
        when(webAccessMock.callUrl(anyString(), any(), anyInt(), any())).thenThrow(ioException);

        assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                .isInstanceOf(IndexerUnreachableException.class)
                .hasMessage("Error while communicating with indexer testindexer. Server returned: Connection reset")
                .hasCause(ioException);
    }

    /**
     * {@code Searcher.shortcutSearch} cancels running indexer searches with an interrupt. Whatever the call ends with
     * then (an interrupted read, or a timeout when the read didn't react to the interrupt), the indexer search must
     * see the exception it treats as "interrupted, ignore" and not count it as an indexer failure. The interrupt flag
     * is cleared, as an interrupted {@code Future.get()} did before.
     */
    @Test
    void shouldReportInterruptedCallAsInterrupted() throws Exception {
        when(webAccessMock.callUrl(anyString(), any(), anyInt(), any())).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            throw new WebAccessException(new SocketTimeoutException("Read timed out"));
        });

        try {
            assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                    .isExactlyInstanceOf(RuntimeException.class)
                    .hasMessage("Unexpected error while accessing indexer")
                    .hasCauseInstanceOf(InterruptedException.class);
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void shouldReportCallInterruptedWhileParsingAsInterrupted() throws Exception {
        when(unmarshallerMock.unmarshal(any())).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return new NewznabXmlRoot();
        });

        try {
            assertThatThrownBy(() -> testee.get(new URI("http://127.0.0.1"), indexerConfig))
                    .isExactlyInstanceOf(RuntimeException.class)
                    .hasCauseInstanceOf(InterruptedException.class);
            assertThat(Thread.currentThread().isInterrupted()).isFalse();
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void shouldKeepMdcOfCallingThread() throws Exception {
        AtomicReference<String> mdcDuringCall = new AtomicReference<>();
        when(webAccessMock.callUrl(anyString(), any(), anyInt(), any())).thenAnswer(invocation -> {
            mdcDuringCall.set(MDC.get("SEARCH"));
            return "<metadata/>";
        });
        MDC.put("SEARCH", "123");
        try {
            testee.get(new URI("http://127.0.0.1"), indexerConfig);
        } finally {
            MDC.remove("SEARCH");
        }

        assertThat(mdcDuringCall.get()).isEqualTo("123");
    }

}