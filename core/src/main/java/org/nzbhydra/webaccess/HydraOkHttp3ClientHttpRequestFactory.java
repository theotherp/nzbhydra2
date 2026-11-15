

package org.nzbhydra.webaccess;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
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
import org.nzbhydra.web.ClientIpResolver;
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
    /**
     * All clients are derived from this one with {@link OkHttpClient#newBuilder()}, so they share its dispatcher and
     * connection pool, and building a client does not set up a new default SSL socket factory and trust manager.
     * It only holds settings which never change at runtime; everything that depends on the config is set on the
     * derived builder.
     */
    private volatile OkHttpClient baseClient;
    private HttpLoggingInterceptor httpLoggingInterceptor;
    private SocketFactory sockProxySocketFactory;

    /**
     * Downloads follow redirects to hosts that can change from call to call, so the cache must not grow without bound.
     * Evicting a client is cheap because all clients share the base client's connection pool and dispatcher. Guava
     * instead of Caffeine because Caffeine's size-bounded caches load generated classes by reflection, which the
     * native image would need metadata for.
     */
    static final int MAX_CACHED_CLIENTS = 300;

    private final Cache<Pair<String, Integer>, OkHttpClient> clientCache = CacheBuilder.newBuilder()
            .maximumSize(MAX_CACHED_CLIENTS)
            .build();

    @PostConstruct
    public void init() {
        MainConfig mainConfig = configProvider.getBaseConfig().getMain();
        sockProxySocketFactory = new SockProxySocketFactory(mainConfig.getProxyHost(), mainConfig.getProxyPort(), mainConfig.getProxyUsername(), mainConfig.getProxyPassword());
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        MainConfig mainConfig = event.getNewConfig().getMain();
        sockProxySocketFactory = new SockProxySocketFactory(mainConfig.getProxyHost(), mainConfig.getProxyPort(), mainConfig.getProxyUsername(), mainConfig.getProxyPassword());
        //Cached clients were built from the old config (proxy, proxy ignore list, SSL verification, ...) and must be rebuilt
        clientCache.invalidateAll();
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
            RequestBody.create(contentType, content) : null);

        Request.Builder builder = new Request.Builder().url(uri.toURL()).method(method.name(), body);
        for (Map.Entry<String, List<String>> entry : headers.headerSet()) {
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
        return clientCache.asMap().computeIfAbsent(Pair.of(host, timeout), key -> buildOkHttpClient(host, timeout));
    }

    private OkHttpClient buildOkHttpClient(String host, Integer timeout) {
        final Builder clientBuilder = getOkHttpClientBuilder(host);
        if (timeout == null) {
            return clientBuilder.build();
        }
        return clientBuilder
                .readTimeout(timeout, TimeUnit.SECONDS)
                .connectTimeout(timeout, TimeUnit.SECONDS)
                .writeTimeout(timeout, TimeUnit.SECONDS).build();
    }

    long getNumberOfCachedClients() {
        return clientCache.size();
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
        Builder builder = getBaseClient().newBuilder();
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

    OkHttpClient getBaseClient() {
        OkHttpClient client = baseClient;
        if (client == null) {
            synchronized (this) {
                client = baseClient;
                if (client == null) {
                    client = new OkHttpClient.Builder().connectionPool(connectionPool).readTimeout(timeout, TimeUnit.SECONDS).build();
                    baseClient = client;
                }
            }
        }
        return client;
    }

    protected boolean isUriToBeIgnoredByProxy(String host) {
        MainConfig mainConfig = configProvider.getBaseConfig().getMain();
        if (mainConfig.isProxyIgnoreLocal()) {
            if (isHostInLocalNetwork(host)) {
                return true;
            }

        }

        if (mainConfig.getProxyIgnoreDomains() == null || mainConfig.getProxyIgnoreDomains().isEmpty()) {
            return false;
        }

        return mainConfig.getProxyIgnoreDomains().stream().anyMatch(x -> isSameHost(x, host));
    }

    private boolean isHostInLocalNetwork(String host) {
        if (host.equalsIgnoreCase("localhost")) {
            return true;
        }

        try {
            InetAddress byName = InetAddress.getByName(host);
            String ipAddress = byName.getHostAddress();
            return ClientIpResolver.PRIVATE_NETWORK_RANGES.stream().anyMatch(matcher -> matcher.matches(ipAddress));
        } catch (UnknownHostException e) {
            logger.error("Error analyzing host {}", host, e);
            return false;
        }
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
            //sockslib's SocksSocket.close() does nothing (its null check is inverted), so OkHttp could neither close
            //the connection nor cancel a running call, e.g. when the call timeout fires. Close the proxy socket ourselves
            Socket proxySocket = proxy.createProxySocket();
            return new SocksSocket(proxy, proxySocket) {
                @Override
                public synchronized void close() throws IOException {
                    proxySocket.close();
                }
            };
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
