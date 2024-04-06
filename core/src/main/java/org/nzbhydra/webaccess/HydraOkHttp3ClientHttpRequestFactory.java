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

package org.nzbhydra.webaccess;

import com.google.common.net.InetAddresses;
import jakarta.annotation.PostConstruct;
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
import org.apache.commons.lang3.tuple.Pair;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.ProxyType;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import sockslib.client.Socks5;
import sockslib.client.SocksProxy;
import sockslib.client.SocksSocket;

import javax.net.SocketFactory;
import javax.net.ssl.SSLSocketFactory;
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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.nzbhydra.webaccess.Ssl.isSameHost;

@Component
@Primary
public class HydraOkHttp3ClientHttpRequestFactory implements ClientHttpRequestFactory {

    @Value("${nzbhydra.connectionTimeout:10}")
    private int timeout;
    private static final Logger logger = LoggerFactory.getLogger(HydraOkHttp3ClientHttpRequestFactory.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private Ssl ssl;

    private final ConnectionPool connectionPool = new ConnectionPool(10, 5, TimeUnit.MINUTES);
    private HttpLoggingInterceptor httpLoggingInterceptor;
    private SocketFactory sockProxySocketFactory;

    private final Map<Pair<String, Integer>, OkHttpClient> clientCache = Collections.synchronizedMap(new HashMap<>());

    @PostConstruct
    public void init() {
        MainConfig mainConfig = configProvider.getBaseConfig().getMain();
        sockProxySocketFactory = new SockProxySocketFactory(mainConfig.getProxyHost(), mainConfig.getProxyPort(), mainConfig.getProxyUsername(), mainConfig.getProxyPassword());
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        MainConfig mainConfig = event.getNewConfig().getMain();
        sockProxySocketFactory = new SockProxySocketFactory(mainConfig.getProxyHost(), mainConfig.getProxyPort(), mainConfig.getProxyUsername(), mainConfig.getProxyPassword());
    }


    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod httpMethod) {
        return new OkHttp3ClientHttpRequest(getOkHttpClient(uri.getHost()), uri, httpMethod);
    }


    static Request buildRequest(HttpHeaders headers, byte[] content, URI uri, HttpMethod method)
        throws MalformedURLException {

        okhttp3.MediaType contentType = getContentType(headers);
        RequestBody body = (content.length > 0 ||
            okhttp3.internal.http.HttpMethod.requiresRequestBody(method.name()) ?
                RequestBody.create(content, contentType) : null);

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

    protected Builder getOkHttpClientBuilder(String host) {
        Builder builder = getBaseBuilder();

        configureBuilderForSsl(builder, host);

        MainConfig main = configProvider.getBaseConfig().getMain();
        if (main.getProxyType() == ProxyType.NONE) {
            return builder;
        }

        if (isUriToBeIgnoredByProxy(host)) {
            logger.debug("Not using proxy for request to {}", host);
            return builder;
        }

        if (main.getProxyType() == ProxyType.SOCKS) {
            return builder.socketFactory(sockProxySocketFactory);
        } else if (main.getProxyType() == ProxyType.HTTP) {
            builder = builder.proxy(new Proxy(Type.HTTP, new InetSocketAddress(main.getProxyHost(), main.getProxyPort())));
            if (main.getProxyUsername() != null) {

                builder = builder.proxyAuthenticator((Route route, Response response) -> {
                    if (response.request().header("Proxy-Authorization") != null) {
                        logger.warn("Authentication with proxy failed");
                        return null; // Give up, we've already failed to authenticate.
                    }

                    String credential = Credentials.basic(main.getProxyUsername(), main.getProxyPassword());
                    return response.request().newBuilder()
                            .header("Proxy-Authorization", credential).build();
                });
            }
        }
        return builder;
    }

    public OkHttpClient getOkHttpClient(String host) {
        return getOkHttpClient(host, null);
    }

    public OkHttpClient getOkHttpClient(String host, Integer timeout) {
        return clientCache.computeIfAbsent(Pair.of(host, timeout), pair -> {
            final Builder clientBuilder = getOkHttpClientBuilder(host);
            if (timeout == null) {
                return clientBuilder.build();
            }
            return clientBuilder
                    .readTimeout(timeout, TimeUnit.SECONDS)
                    .connectTimeout(timeout, TimeUnit.SECONDS)
                    .writeTimeout(timeout, TimeUnit.SECONDS).build();
        });
    }

    void configureBuilderForSsl(Builder builder, String host) {
        final Ssl.SslVerificationState verificationState = ssl.getVerificationStateForHost(host);
        SSLSocketFactory allTrustingSslSocketFactory = ssl.getAllTrustingSslSocketFactory();
        X509TrustManager allTrustingDefaultTrustManager = ssl.getAllTrustingDefaultTrustManager();
        if (verificationState == Ssl.SslVerificationState.ENABLED) {
            builder.sslSocketFactory(ssl.getDefaultSslSocketFactory(), ssl.getDefaultTrustManager());
        } else if (verificationState == Ssl.SslVerificationState.DISABLED_HOST) {
            builder.sslSocketFactory(allTrustingSslSocketFactory, allTrustingDefaultTrustManager)
                    .hostnameVerifier((hostname, session) -> {
                        logger.debug(LoggingMarkers.HTTPS, "Not verifying host name {}", hostname);
                        return true;
                    });
        } else {
            builder.sslSocketFactory(allTrustingSslSocketFactory, allTrustingDefaultTrustManager);
        }
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
                logger.error("Unable to parse host {}", host, e);
                return false;
            }
        }
        if (host.equals("localhost")) {
            return true;
        }
        return null;
    }

    public static long ipToLong(InetAddress ip) {
        byte[] octets = ip.getAddress();
        long result = 0;
        for (byte octet : octets) {
            result <<= 8;
            result |= octet & 0xff;
        }
        return result;
    }


    public static class SockProxySocketFactory extends SocketFactory {

        protected final String host;
        protected final int port;
        protected final String username;
        protected final String password;

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


}
