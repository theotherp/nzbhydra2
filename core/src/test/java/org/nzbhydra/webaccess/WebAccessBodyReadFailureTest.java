package org.nzbhydra.webaccess;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

/**
 * Runs real OkHttp calls against a local server which sends the response headers and then fails to deliver the
 * announced body, either by stalling or by closing the connection. A failed body read must not look like an empty
 * response to the caller.
 */
public class WebAccessBodyReadFailureTest {

    private final List<Socket> openSockets = new CopyOnWriteArrayList<>();
    private final List<ServerSocket> serverSockets = new CopyOnWriteArrayList<>();

    private WebAccess webAccess;

    private enum BodyFailure {
        /**
         * Sends part of the body and then nothing, so the read timeout fires
         */
        STALL,
        /**
         * Sends part of the body and then closes the connection
         */
        CUT
    }

    @BeforeEach
    public void setUp() {
        BaseConfig baseConfig = new BaseConfig();
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);

        HydraOkHttp3ClientHttpRequestFactory requestFactory = new HydraOkHttp3ClientHttpRequestFactory();
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
    void shouldThrowWithTimeoutAsCauseWhenSuccessfulBodyStalls() throws Exception {
        String url = startHttpServer(200, BodyFailure.STALL);

        Throwable thrown = catchThrowable(() -> webAccess.callUrl(url, Collections.emptyMap(), 1));

        assertThat(thrown)
                .isInstanceOf(WebAccessException.class)
                .hasCauseInstanceOf(SocketTimeoutException.class);
    }

    @Test
    void shouldThrowWhenSuccessfulBodyIsCut() throws Exception {
        String url = startHttpServer(200, BodyFailure.CUT);

        Throwable thrown = catchThrowable(() -> webAccess.callUrl(url, Collections.emptyMap(), 10));

        assertThat(thrown)
                .isInstanceOf(IOException.class)
                .isNotInstanceOf(WebAccessException.class);
    }

    @Test
    void shouldReportStatusCodeWithoutBodyWhenErrorBodyIsCut() throws Exception {
        String url = startHttpServer(500, BodyFailure.CUT);

        Throwable thrown = catchThrowable(() -> webAccess.callUrl(url, Collections.emptyMap(), 10));

        assertThat(thrown).isInstanceOf(WebAccessException.class);
        WebAccessException webAccessException = (WebAccessException) thrown;
        assertThat(webAccessException.getCode()).isEqualTo(500);
        assertThat(webAccessException.getBody()).isNull();
    }

    private String startHttpServer(int statusCode, BodyFailure bodyFailure) throws IOException {
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
                startDaemon(() -> serve(socket, statusCode, bodyFailure));
            }
        });
        return "http://127.0.0.1:" + serverSocket.getLocalPort() + "/api";
    }

    private static void serve(Socket socket, int statusCode, BodyFailure bodyFailure) {
        try {
            if (!readRequestHeaders(socket.getInputStream())) {
                return;
            }
            OutputStream out = socket.getOutputStream();
            out.write(("HTTP/1.1 " + statusCode + " Status\r\nContent-Type: text/plain\r\nContent-Length: 1000\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            out.write("partial body".getBytes(StandardCharsets.US_ASCII));
            out.flush();
            if (bodyFailure == BodyFailure.STALL) {
                //Blocks until the client closes the connection
                while (socket.getInputStream().read() != -1) {
                }
            }
        } catch (IOException e) {
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

    private static void startDaemon(Runnable runnable) {
        Thread thread = new Thread(runnable, "failing-body-server");
        thread.setDaemon(true);
        thread.start();
    }

    private static void closeQuietly(Socket socket) {
        try {
            socket.close();
        } catch (IOException ignored) {
        }
    }
}
