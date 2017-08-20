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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
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
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
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
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class HydraOkHttp3ClientHttpRequestFactory
        implements ClientHttpRequestFactory, AsyncClientHttpRequestFactory, DisposableBean {

    private static final Logger logger = LoggerFactory.getLogger(HydraOkHttp3ClientHttpRequestFactory.class);

    private OkHttpClient client;
    @Autowired
    private ConfigProvider configProvider;


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
            return builder.socketFactory(new SF(main.getProxyHost(), main.getProxyPort(), main.getProxyUsername(), main.getProxyPassword()));
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
        return new OkHttpClient().newBuilder();
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
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(java.security.cert.X509Certificate[] chain,
                                                       String authType) throws CertificateException {
                        }

                        @Override
                        public void checkServerTrusted(java.security.cert.X509Certificate[] chain,
                                                       String authType) throws CertificateException {
                        }

                        @Override
                        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }
                    }
            };

            // Install the all-trusting trust manager
            final SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            // Create an ssl socket factory with our all-trusting manager
            final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

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

    protected class SF extends SocketFactory {

        protected String host;
        protected int port;
        protected String username;
        protected String password;

        public SF(String host, int port, String username, String password) {
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
