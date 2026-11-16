package org.nzbhydra.webaccess;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import sockslib.client.Socks5;
import sockslib.client.SocksSocket;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Checks that the vendored sockslib {@link SocksSocket} releases its sockets: on close and when connecting fails.
 * Each check looks at the peer: a socket that was closed shows up there as end of stream.
 */
public class SocksSocketTest {

    private static final int TIMEOUT_MILLIS = 5000;

    private final List<Closeable> closeables = new CopyOnWriteArrayList<>();

    @AfterEach
    public void tearDown() {
        for (Closeable closeable : closeables) {
            try {
                closeable.close();
            } catch (IOException ignored) {
            }
        }
    }

    @Test
    void shouldCloseDirectSocketToLocalTargetWhenConnectFails() throws Exception {
        ServerSocket target = serverSocket();
        //The proxy hangs up right away, so the SOCKS handshake fails
        ServerSocket proxyServer = serverSocket();
        CompletableFuture<Socket> proxySide = acceptOne(proxyServer, Socket::close);
        SocksSocket socksSocket = socksSocket(proxyServer);

        //An explicit host name of 127.0.0.1 makes SocksSocket open its direct socket to the target first
        InetSocketAddress endpoint = new InetSocketAddress(InetAddress.getByAddress("127.0.0.1", new byte[]{127, 0, 0, 1}), target.getLocalPort());
        assertThatThrownBy(() -> socksSocket.connect(endpoint, TIMEOUT_MILLIS)).isInstanceOf(IOException.class);
        proxySide.get(TIMEOUT_MILLIS, TimeUnit.MILLISECONDS);

        Socket directConnection = target.accept();
        closeables.add(directConnection);
        assertThat(readFromPeer(directConnection)).isEqualTo(-1);
    }

    @Test
    void shouldCloseProxySocketWhenConnectFails() throws Exception {
        ServerSocket proxyServer = serverSocket();
        //The proxy cannot reach the target: it answers the CONNECT request with "general SOCKS server failure"
        CompletableFuture<Socket> proxySide = acceptOne(proxyServer, socket -> {
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            readGreeting(in);
            out.write(new byte[]{5, 0});
            out.flush();
            readConnectRequest(in);
            out.write(new byte[]{5, 1, 0, 1, 0, 0, 0, 0, 0, 0});
            out.flush();
        });
        SocksSocket socksSocket = socksSocket(proxyServer);

        assertThatThrownBy(() -> socksSocket.connect(remoteEndpoint(), TIMEOUT_MILLIS)).isInstanceOf(IOException.class);

        assertThat(socksSocket.isClosed()).isTrue();
        assertThat(readFromPeer(proxySide.get(TIMEOUT_MILLIS, TimeUnit.MILLISECONDS))).isEqualTo(-1);
    }

    @Test
    void shouldCloseProxySocketOnClose() throws Exception {
        ServerSocket proxyServer = serverSocket();
        CompletableFuture<Socket> proxySide = acceptOne(proxyServer, socket -> {
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            readGreeting(in);
            out.write(new byte[]{5, 0});
            out.flush();
            readConnectRequest(in);
            out.write(new byte[]{5, 0, 0, 1, 0, 0, 0, 0, 0, 0});
            out.flush();
        });
        SocksSocket socksSocket = socksSocket(proxyServer);
        socksSocket.connect(remoteEndpoint(), TIMEOUT_MILLIS);
        Socket proxyConnection = proxySide.get(TIMEOUT_MILLIS, TimeUnit.MILLISECONDS);
        assertThat(socksSocket.isClosed()).isFalse();

        socksSocket.close();

        assertThat(socksSocket.isClosed()).isTrue();
        assertThat(readFromPeer(proxyConnection)).isEqualTo(-1);
    }

    private SocksSocket socksSocket(ServerSocket proxyServer) throws IOException {
        Socks5 proxy = new Socks5(new InetSocketAddress(InetAddress.getLoopbackAddress(), proxyServer.getLocalPort()));
        SocksSocket socksSocket = new SocksSocket(proxy, proxy.createProxySocket());
        closeables.add(socksSocket.getProxySocket());
        return socksSocket;
    }

    private static InetSocketAddress remoteEndpoint() throws IOException {
        //The host name is given so that no reverse lookup happens. The fake proxy never connects to it
        return new InetSocketAddress(InetAddress.getByAddress("indexer.test", new byte[]{10, 0, 0, 1}), 80);
    }

    private ServerSocket serverSocket() throws IOException {
        ServerSocket serverSocket = new ServerSocket(0, 50, InetAddress.getLoopbackAddress());
        serverSocket.setSoTimeout(TIMEOUT_MILLIS);
        closeables.add(serverSocket);
        return serverSocket;
    }

    private CompletableFuture<Socket> acceptOne(ServerSocket serverSocket, SocketHandler handler) {
        CompletableFuture<Socket> future = new CompletableFuture<>();
        Thread thread = new Thread(() -> {
            try {
                Socket socket = serverSocket.accept();
                closeables.add(socket);
                handler.handle(socket);
                future.complete(socket);
            } catch (IOException e) {
                future.completeExceptionally(e);
            }
        });
        thread.setDaemon(true);
        thread.start();
        return future;
    }

    /**
     * @return what the peer reads: -1 if the other side was closed. Throws a timeout exception if it is still open
     */
    private static int readFromPeer(Socket socket) throws IOException {
        socket.setSoTimeout(TIMEOUT_MILLIS);
        return socket.getInputStream().read();
    }

    private static void readGreeting(InputStream in) throws IOException {
        readFully(in, 1);
        int numberOfMethods = readFully(in, 1)[0] & 0xff;
        readFully(in, numberOfMethods);
    }

    private static void readConnectRequest(InputStream in) throws IOException {
        byte[] header = readFully(in, 4);
        if (header[3] == 1) {
            readFully(in, 4);
        } else if (header[3] == 4) {
            readFully(in, 16);
        } else {
            readFully(in, readFully(in, 1)[0] & 0xff);
        }
        readFully(in, 2);
    }

    private static byte[] readFully(InputStream in, int length) throws IOException {
        byte[] bytes = in.readNBytes(length);
        if (bytes.length != length) {
            throw new IOException("Unexpected end of stream");
        }
        return bytes;
    }

    private interface SocketHandler {
        void handle(Socket socket) throws IOException;
    }
}
