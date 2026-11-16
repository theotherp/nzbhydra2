package org.nzbhydra.webaccess;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ProxyType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.exceptions.IndexerUnreachableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

/**
 * Runs real OkHttp calls against a local server which sends its response too slowly or not at all. Proves that the
 * call timeout bounds the whole call although bytes keep trickling in, and how a thread interrupt (as issued by
 * {@code Searcher.shortcutSearch}) affects a running call, directly and through the SOCKS proxy socket factory.
 * <p>
 * Timings use generous upper bounds; lower bounds are only asserted where nothing can end the call earlier.
 */
public class WebAccessCallTimeoutTest {

    private static final Logger logger = LoggerFactory.getLogger(WebAccessCallTimeoutTest.class);

    private final List<Socket> openSockets = new CopyOnWriteArrayList<>();
    private final List<ServerSocket> serverSockets = new CopyOnWriteArrayList<>();
    private final CountDownLatch bodyStarted = new CountDownLatch(1);
    private final CountDownLatch requestReceived = new CountDownLatch(1);
    private final AtomicInteger proxiedConnections = new AtomicInteger();

    private BaseConfig baseConfig;
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    private WebAccess webAccess;

    private enum ServerMode {
        /**
         * Sends the headers and then one body byte every 100ms, so the read timeout never fires
         */
        TRICKLE,
        /**
         * Reads the request and never answers
         */
        STALL_BEFORE_HEADERS
    }

    @BeforeEach
    public void setUp() {
        baseConfig = new BaseConfig();
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);

        requestFactory = new HydraOkHttp3ClientHttpRequestFactory();
        ReflectionTestUtils.setField(requestFactory, "configProvider", configProvider);
        requestFactory.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));
        requestFactory = spy(requestFactory);
        doNothing().when(requestFactory).configureBuilderForSsl(any(), any());

        webAccess = new WebAccess();
        ReflectionTestUtils.setField(webAccess, "requestFactory", requestFactory);
    }

    @AfterEach
    public void tearDown() {
        for (Socket socket : openSockets) {
            closeQuietly(socket);
        }
        for (ServerSocket serverSocket : serverSockets) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
            }
        }
    }

    @Test
    void shouldAbortTricklingResponseWhenCallTimeoutIsReached() throws Exception {
        String url = startHttpServer(ServerMode.TRICKLE);

        CallOutcome outcome = runCall(url, 10, Duration.ofSeconds(2), false);

        assertThat(outcome.awaitDone(60)).as("Call ended").isTrue();
        assertThat(bodyStarted.getCount()).as("Server had started sending the body").isZero();
        assertThat(outcome.exception.get())
                .isInstanceOf(InterruptedIOException.class)
                .isNotInstanceOf(SocketTimeoutException.class)
                .hasMessage("timeout");
        assertThat(outcome.elapsedMillis()).isBetween(1_500L, 30_000L);
        logger.info("Trickling call ended by call timeout after {}ms", outcome.elapsedMillis());
    }

    @Test
    void shouldNotSetCallTimeoutOnSharedClients() {
        assertThat(requestFactory.getOkHttpClient("127.0.0.1", 5).callTimeoutMillis()).isZero();
        assertThat(requestFactory.getOkHttpClient("127.0.0.1").callTimeoutMillis()).isZero();
    }

    @Test
    void shouldAbortTricklingResponseWhenThreadIsInterrupted() throws Exception {
        String url = startHttpServer(ServerMode.TRICKLE);

        CallOutcome outcome = runCall(url, 30, Duration.ofSeconds(60), false);
        assertThat(bodyStarted.await(30, TimeUnit.SECONDS)).as("Server started sending the body").isTrue();
        long interruptedAt = System.nanoTime();
        outcome.thread.interrupt();

        assertThat(outcome.awaitDone(30)).as("Call ended after interrupt").isTrue();
        long millisAfterInterrupt = TimeUnit.NANOSECONDS.toMillis(outcome.endedAt.get() - interruptedAt);
        assertThat(millisAfterInterrupt).isLessThan(10_000L);
        assertThat(outcome.exception.get())
                .isInstanceOf(InterruptedIOException.class)
                .isNotInstanceOf(SocketTimeoutException.class)
                .hasMessage("interrupted");
        assertThat(outcome.interruptFlagAfterCall.get()).as("Interrupt flag survives the call").isTrue();
        logger.info("Trickling call ended {}ms after interrupt", millisAfterInterrupt);
    }

    /**
     * A thread blocked in a socket read is not woken by an interrupt (platform threads, classic socket I/O). The call
     * timeout still ends the call, and the interrupt flag is still set afterwards so the caller can tell.
     */
    @Test
    void shouldEndStalledInterruptedCallAtCallTimeout() throws Exception {
        String url = startHttpServer(ServerMode.STALL_BEFORE_HEADERS);

        CallOutcome outcome = runCall(url, 60, Duration.ofSeconds(3), false);
        assertThat(requestReceived.await(30, TimeUnit.SECONDS)).as("Server received request").isTrue();
        long interruptedAt = System.nanoTime();
        outcome.thread.interrupt();

        assertThat(outcome.awaitDone(60)).as("Call ended").isTrue();
        long millisAfterInterrupt = TimeUnit.NANOSECONDS.toMillis(outcome.endedAt.get() - interruptedAt);
        assertThat(millisAfterInterrupt).isLessThan(30_000L);
        assertThat(outcome.exception.get()).isInstanceOf(InterruptedIOException.class);
        assertThat(outcome.interruptFlagAfterCall.get()).as("Interrupt flag survives the call").isTrue();
        logger.info("Stalled call ended {}ms after interrupt with {}", millisAfterInterrupt, outcome.exception.get().toString());
    }

    @Test
    void shouldAbortTricklingResponseThroughSocksProxyWhenCallTimeoutIsReached() throws Exception {
        String url = startHttpServer(ServerMode.TRICKLE);
        useSocksProxy(startSocksProxy());

        CallOutcome outcome = runCall(url, 10, Duration.ofSeconds(2), false);

        assertThat(outcome.awaitDone(60)).as("Call ended").isTrue();
        assertThat(proxiedConnections.get()).as("Call went through the SOCKS proxy").isPositive();
        assertThat(bodyStarted.getCount()).as("Server had started sending the body").isZero();
        assertThat(outcome.exception.get())
                .isInstanceOf(InterruptedIOException.class)
                .isNotInstanceOf(SocketTimeoutException.class)
                .hasMessage("timeout");
        assertThat(outcome.elapsedMillis()).isBetween(1_500L, 30_000L);
        logger.info("Trickling call through SOCKS ended by call timeout after {}ms", outcome.elapsedMillis());
    }

    @Test
    void shouldAbortTricklingResponseThroughSocksProxyWhenThreadIsInterrupted() throws Exception {
        String url = startHttpServer(ServerMode.TRICKLE);
        useSocksProxy(startSocksProxy());

        CallOutcome outcome = runCall(url, 30, Duration.ofSeconds(60), false);
        assertThat(bodyStarted.await(30, TimeUnit.SECONDS)).as("Server started sending the body").isTrue();
        long interruptedAt = System.nanoTime();
        outcome.thread.interrupt();

        assertThat(outcome.awaitDone(30)).as("Call ended after interrupt").isTrue();
        long millisAfterInterrupt = TimeUnit.NANOSECONDS.toMillis(outcome.endedAt.get() - interruptedAt);
        assertThat(proxiedConnections.get()).as("Call went through the SOCKS proxy").isPositive();
        assertThat(millisAfterInterrupt).isLessThan(10_000L);
        assertThat(outcome.exception.get())
                .isInstanceOf(InterruptedIOException.class)
                .hasMessage("interrupted");
        logger.info("Trickling call through SOCKS ended {}ms after interrupt", millisAfterInterrupt);
    }

    @Test
    void shouldReportTricklingIndexerResponseAsNotCompletedInTime() throws Exception {
        String url = startHttpServer(ServerMode.TRICKLE);

        CallOutcome outcome = runCall(url, 1, null, true);

        assertThat(outcome.awaitDone(60)).as("Call ended").isTrue();
        assertThat(outcome.exception.get())
                .isInstanceOf(IndexerUnreachableException.class)
                .hasMessage("Indexer did not complete request within 1 seconds");
        assertThat(outcome.elapsedMillis()).isBetween(1_500L, 30_000L);
    }

    @Test
    void shouldReportInterruptedIndexerCallAsInterrupted() throws Exception {
        String url = startHttpServer(ServerMode.TRICKLE);

        CallOutcome outcome = runCall(url, 30, null, true);
        assertThat(bodyStarted.await(30, TimeUnit.SECONDS)).as("Server started sending the body").isTrue();
        outcome.thread.interrupt();

        assertThat(outcome.awaitDone(30)).as("Call ended after interrupt").isTrue();
        assertThat(outcome.exception.get())
                .isInstanceOf(RuntimeException.class)
                .hasCauseInstanceOf(InterruptedException.class);
        assertThat(outcome.interruptFlagAfterCall.get()).as("Interrupt flag is cleared like an interrupted Future.get() did").isFalse();
    }

    private CallOutcome runCall(String url, int timeout, Duration callTimeout, boolean viaIndexerWebAccess) {
        CallOutcome outcome = new CallOutcome();
        outcome.thread = new Thread(() -> {
            outcome.startedAt.set(System.nanoTime());
            try {
                if (viaIndexerWebAccess) {
                    buildIndexerWebAccess().get(URI.create(url), buildIndexerConfig(timeout), String.class);
                } else {
                    webAccess.callUrl(url, Collections.emptyMap(), timeout, callTimeout);
                }
            } catch (Exception e) {
                outcome.exception.set(e);
            } finally {
                outcome.endedAt.set(System.nanoTime());
                outcome.interruptFlagAfterCall.set(Thread.currentThread().isInterrupted());
                outcome.done.countDown();
            }
        }, "call-under-test");
        outcome.thread.setDaemon(true);
        outcome.thread.start();
        return outcome;
    }

    private IndexerWebAccess buildIndexerWebAccess() {
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        IndexerWebAccess indexerWebAccess = new IndexerWebAccess();
        ReflectionTestUtils.setField(indexerWebAccess, "configProvider", configProvider);
        ReflectionTestUtils.setField(indexerWebAccess, "webAccess", webAccess);
        return indexerWebAccess;
    }

    private static IndexerConfig buildIndexerConfig(int timeout) {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName("slowindexer");
        indexerConfig.setTimeout(timeout);
        indexerConfig.setUserAgent("test");
        return indexerConfig;
    }

    private void useSocksProxy(int proxyPort) {
        baseConfig.getMain().setProxyType(ProxyType.SOCKS);
        baseConfig.getMain().setProxyHost("127.0.0.1");
        baseConfig.getMain().setProxyPort(proxyPort);
        baseConfig.getMain().setProxyIgnoreLocal(false);
        requestFactory.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));
    }

    private String startHttpServer(ServerMode mode) throws IOException {
        ServerSocket serverSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        serverSockets.add(serverSocket);
        startDaemon(() -> {
            while (!serverSocket.isClosed()) {
                Socket socket;
                try {
                    socket = serverSocket.accept();
                } catch (IOException e) {
                    return;
                }
                openSockets.add(socket);
                startDaemon(() -> serve(socket, mode));
            }
        });
        return "http://127.0.0.1:" + serverSocket.getLocalPort() + "/api";
    }

    private void serve(Socket socket, ServerMode mode) {
        try {
            if (!readRequestHeaders(socket.getInputStream())) {
                return;
            }
            requestReceived.countDown();
            if (mode == ServerMode.STALL_BEFORE_HEADERS) {
                //Blocks until the client closes the connection
                while (socket.getInputStream().read() != -1) {
                }
                return;
            }
            OutputStream out = socket.getOutputStream();
            out.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 100000\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
            out.flush();
            for (int i = 0; i < 100_000; i++) {
                out.write('a');
                out.flush();
                bodyStarted.countDown();
                Thread.sleep(100);
            }
        } catch (IOException | InterruptedException e) {
            //Client went away
        } finally {
            closeQuietly(socket);
        }
    }

    private static boolean readRequestHeaders(InputStream in) throws IOException {
        int matched = 0;
        byte[] end = {'\r', '\n', '\r', '\n'};
        int b;
        while ((b = in.read()) != -1) {
            matched = b == end[matched] ? matched + 1 : (b == '\r' ? 1 : 0);
            if (matched == end.length) {
                return true;
            }
        }
        return false;
    }

    /**
     * Minimal SOCKS5 proxy (no authentication, CONNECT only) which pipes the bytes between client and target.
     */
    private int startSocksProxy() throws IOException {
        ServerSocket serverSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        serverSockets.add(serverSocket);
        startDaemon(() -> {
            while (!serverSocket.isClosed()) {
                Socket client;
                try {
                    client = serverSocket.accept();
                } catch (IOException e) {
                    return;
                }
                openSockets.add(client);
                startDaemon(() -> proxy(client));
            }
        });
        return serverSocket.getLocalPort();
    }

    private void proxy(Socket client) {
        try {
            InputStream in = client.getInputStream();
            OutputStream out = client.getOutputStream();
            //Greeting: version, number of methods, methods
            readFully(in, 1);
            int numberOfMethods = readFully(in, 1)[0] & 0xff;
            readFully(in, numberOfMethods);
            out.write(new byte[]{5, 0});
            out.flush();
            //Request: version, command, reserved, address type, address, port
            byte[] request = readFully(in, 4);
            InetAddress targetAddress;
            if (request[3] == 1) {
                targetAddress = InetAddress.getByAddress(readFully(in, 4));
            } else if (request[3] == 4) {
                targetAddress = InetAddress.getByAddress(readFully(in, 16));
            } else {
                int length = readFully(in, 1)[0] & 0xff;
                targetAddress = InetAddress.getByName(new String(readFully(in, length), StandardCharsets.US_ASCII));
            }
            byte[] portBytes = readFully(in, 2);
            int targetPort = ((portBytes[0] & 0xff) << 8) | (portBytes[1] & 0xff);
            Socket target = new Socket();
            openSockets.add(target);
            target.connect(new InetSocketAddress(targetAddress, targetPort));
            proxiedConnections.incrementAndGet();
            out.write(new byte[]{5, 0, 0, 1, 0, 0, 0, 0, 0, 0});
            out.flush();
            AtomicBoolean closed = new AtomicBoolean();
            startDaemon(() -> pipe(target, client, closed));
            pipe(client, target, closed);
        } catch (IOException e) {
            closeQuietly(client);
        }
    }

    private static void pipe(Socket from, Socket to, AtomicBoolean closed) {
        byte[] buffer = new byte[8192];
        try {
            InputStream in = from.getInputStream();
            OutputStream out = to.getOutputStream();
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                out.flush();
            }
        } catch (IOException ignored) {
        } finally {
            if (closed.compareAndSet(false, true)) {
                closeQuietly(from);
                closeQuietly(to);
            }
        }
    }

    private static byte[] readFully(InputStream in, int length) throws IOException {
        byte[] bytes = in.readNBytes(length);
        if (bytes.length != length) {
            throw new IOException("Unexpected end of stream");
        }
        return bytes;
    }

    private static void startDaemon(Runnable runnable) {
        Thread thread = new Thread(runnable, "slow-server");
        thread.setDaemon(true);
        thread.start();
    }

    private static void closeQuietly(Socket socket) {
        try {
            socket.close();
        } catch (IOException ignored) {
        }
    }

    private static class CallOutcome {
        private Thread thread;
        private final AtomicReference<Long> startedAt = new AtomicReference<>();
        private final AtomicReference<Long> endedAt = new AtomicReference<>();
        private final AtomicReference<Exception> exception = new AtomicReference<>();
        private final AtomicBoolean interruptFlagAfterCall = new AtomicBoolean();
        private final CountDownLatch done = new CountDownLatch(1);

        private boolean awaitDone(int seconds) throws InterruptedException {
            return done.await(seconds, TimeUnit.SECONDS);
        }

        private long elapsedMillis() {
            return TimeUnit.NANOSECONDS.toMillis(endedAt.get() - startedAt.get());
        }
    }
}
