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
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.ProxyType;
import org.nzbhydra.misc.DelegatingSSLSocketFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
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

import javax.net.SocketFactory;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MalformedURLException;
import java.net.Proxy;
import java.net.Proxy.Type;
import java.net.Socket;
import java.net.URI;
import java.net.UnknownHostException;
import java.security.GeneralSecurityException;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Primary
public class HydraOkHttp3ClientHttpRequestFactory
        implements ClientHttpRequestFactory, AsyncClientHttpRequestFactory, DisposableBean {

    private static final Logger logger = LoggerFactory.getLogger(HydraOkHttp3ClientHttpRequestFactory.class);
    private static Pattern HOST_PATTERN = Pattern.compile("(\\w+\\.)?(\\S+\\.\\S+)", Pattern.CASE_INSENSITIVE);

    private OkHttpClient client;
    @Autowired
    private ConfigProvider configProvider;
    private final ConnectionPool connectionPool = new ConnectionPool(10, 5, TimeUnit.MINUTES);


    /**
     * Sets the underlying read timeout in milliseconds.
     * A value of 0 specifies an infinite timeout.
     *
     * @see OkHttpClient.Builder#readTimeout(long, TimeUnit)
     */
    public void setReadTimeout(int readTimeout) {
        //TODO
        this.client = this.client.newBuilder()
                .readTimeout(readTimeout, TimeUnit.MILLISECONDS)
                .build();
    }

    /**
     * Sets the underlying write timeout in milliseconds.
     * A value of 0 specifies an infinite timeout.
     *
     * @see OkHttpClient.Builder#writeTimeout(long, TimeUnit)
     */
    public void setWriteTimeout(int writeTimeout) {
        //TODO
        this.client = this.client.newBuilder()
                .writeTimeout(writeTimeout, TimeUnit.MILLISECONDS)
                .build();
    }

    /**
     * Sets the underlying connect timeout in milliseconds.
     * A value of 0 specifies an infinite timeout.
     *
     * @see OkHttpClient.Builder#connectTimeout(long, TimeUnit)
     */
    public void setConnectTimeout(int connectTimeout) {
        //TODO
        this.client = this.client.newBuilder()
                .connectTimeout(connectTimeout, TimeUnit.MILLISECONDS)
                .build();
    }


    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod httpMethod) {

        return new OkHttp3ClientHttpRequest(getOkHttpClientBuilder(uri).build(), uri, httpMethod);

    }

    @Override
    public AsyncClientHttpRequest createAsyncRequest(URI uri, HttpMethod httpMethod) {
        return new OkHttp3AsyncClientHttpRequest(getOkHttpClientBuilder(uri).build(), uri, httpMethod);
    }


    @Override
    public void destroy() throws IOException {
        // Clean up the client if we created it in the constructor
        try {
            if (this.client.cache() != null) {
                this.client.cache().close();
            }
            this.client.dispatcher().executorService().shutdown();
        } catch (NullPointerException e) {
            //Ignore
        }
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
        if (!configProvider.getBaseConfig().getMain().isVerifySsl()) {
            builder = getUnsafeOkHttpClientBuilder(builder);
        } else {
            try {
                SSLSocketFactory sslSocketFactory = getSslSocketFactory(new TrustManager[]{
                        getDefaultX509TrustManager()
                });
                builder = builder.sslSocketFactory(new SniWhitelistingSocketFactory(sslSocketFactory), getDefaultX509TrustManager());
            } catch (NoSuchAlgorithmException | KeyManagementException e) {
                throw new RuntimeException("Unable to create SSLSocketFactory", e);
            }
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
            SockProxySocketFactory sockProxySocketFactory = new SockProxySocketFactory(main.getProxyHost(), main.getProxyPort(), main.getProxyUsername(), main.getProxyPassword());
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
        return new OkHttpClient().newBuilder().connectionPool(connectionPool);
    }

    protected boolean isUriToBeIgnoredByProxy(String host) {
        MainConfig mainConfig = configProvider.getBaseConfig().getMain();
        if (mainConfig.isProxyIgnoreLocal()) {
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
        }

        if (mainConfig.getProxyIgnoreDomains() == null || mainConfig.getProxyIgnoreDomains().isEmpty()) {
            return false;
        }

        return mainConfig.getProxyIgnoreDomains().stream().anyMatch(x -> host.toLowerCase().matches(("\\Q" + x.toLowerCase() + "\\E").replace("*", "\\E.*\\Q")));
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

    //From https://gist.github.com/mefarazath/c9b588044d6bffd26aac3c520660bf40
    private Builder getUnsafeOkHttpClientBuilder(Builder builder) {
        try {
            // Create a trust manager that does not validate certificate chains
            final TrustManager[] trustAllCerts = new TrustManager[]{
                    getAllTrustingX509TrustManager()
            };

            final SSLSocketFactory sslSocketFactory = new SniWhitelistingSocketFactory(getSslSocketFactory(trustAllCerts));

            return builder
                    .sslSocketFactory(sslSocketFactory, (X509TrustManager) trustAllCerts[0])
                    .hostnameVerifier(new HostnameVerifier() {
                        @Override
                        public boolean verify(String hostname, SSLSession session) {
                            return true;
                        }
                    });

        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private SSLSocketFactory getSslSocketFactory(TrustManager[] trustAllCerts) throws NoSuchAlgorithmException, KeyManagementException {
        final SSLContext sslContext = SSLContext.getInstance("SSL");
        sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
        return sslContext.getSocketFactory();
    }

    private X509TrustManager getDefaultX509TrustManager() {
        try {
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                    TrustManagerFactory.getDefaultAlgorithm());
            trustManagerFactory.init((KeyStore) null);
            TrustManager[] trustManagers = trustManagerFactory.getTrustManagers();
            if (trustManagers.length != 1 || !(trustManagers[0] instanceof X509TrustManager)) {
                throw new IllegalStateException("Unexpected default trust managers:"
                        + Arrays.toString(trustManagers));
            }
            return (X509TrustManager) trustManagers[0];
        } catch (GeneralSecurityException e) {
            throw new AssertionError(); // The system has no TLS. Just give up.
        }
    }

    private X509TrustManager getAllTrustingX509TrustManager() {
        return new X509TrustManager() {
            @Override
            public void checkClientTrusted(X509Certificate[] chain,
                                           String authType) throws CertificateException {
            }

            @Override
            public void checkServerTrusted(X509Certificate[] chain,
                                           String authType) throws CertificateException {
            }

            @Override
            public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }
        };
    }


    protected class SniWhitelistingSocketFactory extends DelegatingSSLSocketFactory {

        public SniWhitelistingSocketFactory(SSLSocketFactory delegate) {
            super(delegate);
        }

        @Override
        public SSLSocket createSocket(Socket socket, final String host, int port, boolean autoClose) throws IOException {
            String newHost = host;

            if (host != null && configProvider.getBaseConfig().getMain().getSniDisabledFor().stream().anyMatch(x -> isSameHost(host, x))) {
                newHost = null;
            }
            return super.createSocket(socket, newHost, port, autoClose);
        }

        protected boolean isSameHost(final String a, final String b) {
            if (a == null || b == null) {
                return false;
            }
            Matcher aMatcher = HOST_PATTERN.matcher(a);
            Matcher bMatcher = HOST_PATTERN.matcher(b);
            if (!aMatcher.matches()) {
                logger.warn("Unable to parse host {}", a);
            }
            if (!bMatcher.matches()) {
                logger.warn("Unable to parse host {}", b);
            }

            return aMatcher.group(2).toLowerCase().equals(bMatcher.group(2).toLowerCase());
        }
    }

    protected class SockProxySocketFactory extends SocketFactory {

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

        public Socket createSocket(String host, int port) throws IOException, UnknownHostException {
            throw new RuntimeException("Would skip the proxy, not supported");
        }

        public Socket createSocket(InetAddress address, int port) throws IOException {
            throw new RuntimeException("Would skip the proxy, not supported");
        }

        public Socket createSocket(String host, int port, InetAddress localhost, int localport) throws IOException, UnknownHostException {
            throw new RuntimeException("Would skip the proxy, not supported");
        }

        public Socket createSocket(InetAddress host, int port, InetAddress localhost, int localport) throws IOException {
            throw new RuntimeException("Would skip the proxy, not supported");
        }
    }

}
