package org.nzbhydra.misc;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;

/**
 * A {@link SSLSocketFactory} that delegates calls. Sockets can be configured after creation by
 * overriding {@link #configureSocket(SSLSocket)}.
 */
public class DelegatingSSLSocketFactory extends SSLSocketFactory {

    private final SSLSocketFactory delegate;

    public DelegatingSSLSocketFactory(SSLSocketFactory delegate) {
        this.delegate = delegate;
    }

    @Override
    public SSLSocket createSocket() throws IOException {
        SSLSocket sslSocket = (SSLSocket) delegate.createSocket();
        return configureSocket(sslSocket);
    }

    @Override
    public SSLSocket createSocket(String host, int port) throws IOException {
        SSLSocket sslSocket = (SSLSocket) delegate.createSocket(host, port);
        return configureSocket(sslSocket);
    }

    @Override
    public SSLSocket createSocket(
            String host, int port, InetAddress localAddress, int localPort) throws IOException {
        SSLSocket sslSocket = (SSLSocket) delegate.createSocket(host, port, localAddress, localPort);
        return configureSocket(sslSocket);
    }

    @Override
    public SSLSocket createSocket(InetAddress host, int port) throws IOException {
        SSLSocket sslSocket = (SSLSocket) delegate.createSocket(host, port);
        return configureSocket(sslSocket);
    }

    @Override
    public SSLSocket createSocket(
            InetAddress host, int port, InetAddress localAddress, int localPort) throws IOException {
        SSLSocket sslSocket = (SSLSocket) delegate.createSocket(host, port, localAddress, localPort);
        return configureSocket(sslSocket);
    }

    @Override
    public String[] getDefaultCipherSuites() {
        return delegate.getDefaultCipherSuites();
    }

    @Override
    public String[] getSupportedCipherSuites() {
        return delegate.getSupportedCipherSuites();
    }

    @Override
    public SSLSocket createSocket(
            Socket socket, String host, int port, boolean autoClose) throws IOException {
        SSLSocket sslSocket = (SSLSocket) delegate.createSocket(socket, host, port, autoClose);
        return configureSocket(sslSocket);
    }

    protected SSLSocket configureSocket(SSLSocket sslSocket) throws IOException {
        // No-op by default.
        return sslSocket;
    }
}
