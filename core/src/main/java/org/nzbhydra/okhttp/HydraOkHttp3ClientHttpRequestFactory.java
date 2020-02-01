/*
 * Copyright 2002-2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.nzbhydra.okhttp;

import com.google.common.net.InetAddresses;
import joptsimple.internal.Strings;
import okhttp3.ConnectionPool;
import okhttp3.Credentials;
import okhttp3.OkHttpClient;
import okhttp3.OkHttpClient.Builder;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.Route;
import okhttp3.logging.HttpLoggingInterceptor;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.downloading.ProxyType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.misc.DelegatingSSLSocketFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.AsyncClientHttpRequest;
import org.springframework.http.client.AsyncClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import sockslib.client.Socks5;
import sockslib.client.SocksProxy;
import sockslib.client.SocksSocket;

import javax.annotation.PostConstruct;
import javax.net.SocketFactory;
import javax.net.ssl.KeyManager;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MalformedURLException;
import java.net.NetworkInterface;
import java.net.Proxy;
import java.net.Proxy.Type;
import java.net.Socket;
import java.net.SocketException;
import java.net.URI;
import java.net.UnknownHostException;
import java.security.GeneralSecurityException;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Primary
public class HydraOkHttp3ClientHttpRequestFactory implements ClientHttpRequestFactory, AsyncClientHttpRequestFactory {

    @Value("${nzbhydra.connectionTimeout:10}")
    private int timeout;

    private static final Logger logger = LoggerFactory.getLogger(HydraOkHttp3ClientHttpRequestFactory.class);
    private static Pattern HOST_PATTERN = Pattern.compile("((\\w|\\*)+\\.)?(\\S+\\.\\S+)", Pattern.CASE_INSENSITIVE);

    @Autowired
    private ConfigProvider configProvider;

    private final ConnectionPool connectionPool = new ConnectionPool(10, 5, TimeUnit.MINUTES);
    private SocketFactory sockProxySocketFactory;
    private SSLSocketFactory defaultSslSocketFactory;
    private X509TrustManager defaultTrustManager;
    private SSLSocketFactory allTrustingSslSocketFactory;
    private X509TrustManager allTrustingDefaultTrustManager = new AllTrustingManager();
    private HttpLoggingInterceptor httpLoggingInterceptor;

    @PostConstruct
    public void init() {
        initSocketFactory(configProvider.getBaseConfig().getMain());
    }

    private void initSocketFactory(MainConfig mainConfig) {
        loadCacerts();
        loadAllTrustingTrustManager();
        sockProxySocketFactory = new SockProxySocketFactory(mainConfig.getProxyHost(), mainConfig.getProxyPort(), mainConfig.getProxyUsername(), mainConfig.getProxyPassword());
    }

    private void loadAllTrustingTrustManager() {
        try {
            final TrustManager[] trustAllCerts = new TrustManager[]{allTrustingDefaultTrustManager};
            final SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            allTrustingSslSocketFactory = new SniWhitelistingSocketFactory(sslContext.getSocketFactory());
            allTrustingDefaultTrustManager = (X509TrustManager) trustAllCerts[0];
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            logger.error("Error while creating all-trusting trust manager", e);
        }
    }

    private void loadCacerts() {
        try {
            KeyStore keystore = KeyStore.getInstance(KeyStore.getDefaultType());
            InputStream keystoreStream = NzbHydra.class.getResource("/cacerts").openStream();
            keystore.load(keystoreStream, null);

            TrustManagerFactory customTrustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            customTrustManagerFactory.init(keystore);
            TrustManager[] trustManagers = customTrustManagerFactory.getTrustManagers();

            KeyManagerFactory keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            keyManagerFactory.init(keystore, null);
            KeyManager[] keyManagers = keyManagerFactory.getKeyManagers();

            SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(keyManagers, trustManagers, null);
            SSLContext.setDefault(sslContext);
            SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

            defaultTrustManager = (X509TrustManager) trustManagers[0];
            defaultSslSocketFactory = new SniWhitelistingSocketFactory(sslSocketFactory);
        } catch (IOException | GeneralSecurityException e) {
            logger.error("Unable to load packaged cacerts file", e);
        }
    }

    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod httpMethod) {
        return new OkHttp3ClientHttpRequest(getOkHttpClientBuilder(uri).build(), uri, httpMethod);
    }

    @Override
    public AsyncClientHttpRequest createAsyncRequest(URI uri, HttpMethod httpMethod) {
        return new OkHttp3AsyncClientHttpRequest(getOkHttpClientBuilder(uri).build(), uri, httpMethod);
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        initSocketFactory(event.getNewConfig().getMain());
    }

    static Request buildRequest(HttpHeaders headers, byte[] content, URI uri, HttpMethod method)
            throws MalformedURLException {

        okhttp3.MediaType contentType = getContentType(headers);
        RequestBody body = (content.length > 0 ||
                okhttp3.internal.http.HttpMethod.requiresRequestBody(method.name()) ?
                RequestBody.create(contentType, content) : null);

        Request.Builder builder = new Request.Builder().url(uri.toURL()).method(method.name(), body);
        for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
            String headerName = entry.getKey();
            for (String headerValue : entry.getValue()) {
                builder.addHeader(headerName, headerValue);
            }
        }
        return builder.build();
    }

    private static okhttp3.MediaType getContentType(HttpHeaders headers) {
        String rawContentType = headers.getFirst(HttpHeaders.CONTENT_TYPE);
        return (StringUtils.hasText(rawContentType) ? okhttp3.MediaType.parse(rawContentType) : null);
    }

    public Builder getOkHttpClientBuilder(URI requestUri) {
        Builder builder = getBaseBuilder();

        String host = requestUri.getHost();
        if (!configProvider.getBaseConfig().getMain().isVerifySsl()) {
            logger.debug(LoggingMarkers.HTTPS, "Ignoring SSL certificates because option not to verify SSL is set");
            builder.sslSocketFactory(allTrustingSslSocketFactory, allTrustingDefaultTrustManager);
        } else if (host != null && configProvider.getBaseConfig().getMain().getVerifySslDisabledFor().stream().anyMatch(x -> isSameHost(host, x))) {
            logger.debug(LoggingMarkers.HTTPS, "Ignoring SSL certificates because option not to verify SSL is set for host {}", host);
            builder.sslSocketFactory(allTrustingSslSocketFactory, allTrustingDefaultTrustManager);
        } else if (host != null && isLocal(host)) {
            logger.debug(LoggingMarkers.HTTPS, "Ignoring SSL certificates because host {} is local", host);
            builder.sslSocketFactory(allTrustingSslSocketFactory, allTrustingDefaultTrustManager);
        } else {
            logger.debug(LoggingMarkers.HTTPS, "Not ignoring SSL certificates");
            builder.sslSocketFactory(defaultSslSocketFactory, defaultTrustManager);
        }

        MainConfig main = configProvider.getBaseConfig().getMain();
        if (main.getProxyType() == ProxyType.NONE) {
            return builder;
        }

        if (isUriToBeIgnoredByProxy(requestUri.getHost())) {
            logger.debug("Not using proxy for request to {}", requestUri.getHost());
            return builder;
        }

        if (main.getProxyType() == ProxyType.SOCKS) {
            return builder.socketFactory(sockProxySocketFactory);
        } else if (main.getProxyType() == ProxyType.HTTP) {
            builder = builder.proxy(new Proxy(Type.HTTP, new InetSocketAddress(main.getProxyHost(), main.getProxyPort()))).proxyAuthenticator((Route route, Response response) -> {
                if (response.request().header("Proxy-Authorization") != null) {
                    logger.warn("Authentication with proxy failed");
                    return null; // Give up, we've already failed to authenticate.
                }

                String credential = Credentials.basic(main.getProxyUsername(), main.getProxyPassword());
                return response.request().newBuilder()
                        .header("Proxy-Authorization", credential).build();
            });
        }
        return builder;
    }

    protected Builder getBaseBuilder() {
        Builder builder = new OkHttpClient().newBuilder().connectionPool(connectionPool).readTimeout(timeout, TimeUnit.SECONDS);
        if (configProvider.getBaseConfig().getMain().getLogging().getMarkersToLog().contains(LoggingMarkers.HTTP.getName())) {
            try {
                if (httpLoggingInterceptor == null) {
                    HttpLoggingInterceptor.Logger httpLogger = message -> logger.debug(LoggingMarkers.HTTP, message);
                    httpLoggingInterceptor = new HttpLoggingInterceptor(httpLogger);
                    httpLoggingInterceptor.setLevel(HttpLoggingInterceptor.Level.HEADERS);
                    httpLoggingInterceptor.redactHeader("Authorization");
                    httpLoggingInterceptor.redactHeader("Cookie");
                }
                builder.addInterceptor(httpLoggingInterceptor);
            } catch (Exception e) {
                logger.error("Unable to log HTTP", e);
            }
        }

        return builder;
    }

    protected boolean isUriToBeIgnoredByProxy(String host) {
        MainConfig mainConfig = configProvider.getBaseConfig().getMain();
        if (mainConfig.isProxyIgnoreLocal()) {
            Boolean ipToLong = isHostInLocalNetwork(host);
            if (ipToLong != null) {
                return ipToLong;
            }
        }

        if (mainConfig.getProxyIgnoreDomains() == null || mainConfig.getProxyIgnoreDomains().isEmpty()) {
            return false;
        }

        return mainConfig.getProxyIgnoreDomains().stream().anyMatch(x -> isSameHost(x, host));
    }

    private Boolean isHostInLocalNetwork(String host) {
        if (InetAddresses.isInetAddress(host)) {
            try {
                InetAddress byName = InetAddress.getByName(host);
                long ipToLong = ipToLong(byName);
                return host.equals("127.0.0.1")
                        ||
                        (ipToLong >= ipToLong(InetAddress.getByName("10.0.0.0")) && ipToLong <= ipToLong(InetAddress.getByName("10.255.255.255")))
                        ||
                        (ipToLong >= ipToLong(InetAddress.getByName("172.16.0.0")) && ipToLong <= ipToLong(InetAddress.getByName("172.16.255.255")))
                        ||
                        (ipToLong >= ipToLong(InetAddress.getByName("192.168.0.0")) && ipToLong <= ipToLong(InetAddress.getByName("192.168.255.255")))
                        ;
            } catch (UnknownHostException e) {
                logger.error("Unable to parse host " + host, e);
                return false;
            }
        }
        if (host.equals("localhost")) {
            return true;
        }
        return null;
    }

    private static long ipToLong(InetAddress ip) {
        byte[] octets = ip.getAddress();
        long result = 0;
        for (byte octet : octets) {
            result <<= 8;
            result |= octet & 0xff;
        }
        return result;
    }


    protected boolean isSameHost(final String a, final String b) {
        if (a == null || b == null) {
            return false;
        }
        if (a.equalsIgnoreCase(b)) {
            return true;
        }
        Matcher aMatcher = HOST_PATTERN.matcher(a);
        Matcher bMatcher = HOST_PATTERN.matcher(b);
        if (!aMatcher.matches() || !bMatcher.matches()) {
            return false;
        }

        return aMatcher.group(3).toLowerCase().equals(bMatcher.group(3).toLowerCase());
    }

    //https://stackoverflow.com/a/2406819/184264
    private static boolean isLocal(String host) {
        InetAddress addr;
        try {
            addr = InetAddress.getByName(host);
        } catch (UnknownHostException e) {
            return false;
        }
        if (addr.isAnyLocalAddress() || addr.isLoopbackAddress()) {
            return true;
        }

        try {
            return NetworkInterface.getByInetAddress(addr) != null;
        } catch (SocketException e) {
            return false;
        }
    }


    protected class SniWhitelistingSocketFactory extends DelegatingSSLSocketFactory {

        public SniWhitelistingSocketFactory(SSLSocketFactory delegate) {
            super(delegate);
        }

        @Override
        public SSLSocket createSocket(Socket socket, final String host, int port, boolean autoClose) throws IOException {
            SSLSocket newSocket = super.createSocket(socket, host, port, autoClose);
            if (host != null && configProvider.getBaseConfig().getMain().getSniDisabledFor().stream().anyMatch(x -> isSameHost(host, x))) {
                logger.debug(LoggingMarkers.HTTPS, "Ignoring SNI for  host name {}", host);
                SSLParameters sslParameters = newSocket.getSSLParameters();
                sslParameters.setServerNames(Collections.emptyList());
                newSocket.setSSLParameters(sslParameters);
            }
            return newSocket;
        }
    }


    protected static class SockProxySocketFactory extends SocketFactory {

        protected String host;
        protected int port;
        protected String username;
        protected String password;

        public SockProxySocketFactory(String host, int port, String username, String password) {
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
        }

        public Socket createSocket() throws IOException {
            SocksProxy proxy;
            if (!Strings.isNullOrEmpty(username)) {
                proxy = new Socks5(new InetSocketAddress(host, port), username, password);
            } else {
                proxy = new Socks5(new InetSocketAddress(host, port));
            }
            Socket socket = new SocksSocket(proxy);
            return socket;
        }

        public Socket createSocket(String host, int port) {
            throw new RuntimeException("Would skip the proxy, not supported");
        }

        public Socket createSocket(InetAddress address, int port) {
            throw new RuntimeException("Would skip the proxy, not supported");
        }

        public Socket createSocket(String host, int port, InetAddress localhost, int localport) {
            throw new RuntimeException("Would skip the proxy, not supported");
        }

        public Socket createSocket(InetAddress host, int port, InetAddress localhost, int localport) {
            throw new RuntimeException("Would skip the proxy, not supported");
        }
    }

    private static class AllTrustingManager implements X509TrustManager {

        @Override
        public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {
        }

        @Override
        public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {
        }

        @Override
        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
            return new java.security.cert.X509Certificate[]{};
        }
    }
}
