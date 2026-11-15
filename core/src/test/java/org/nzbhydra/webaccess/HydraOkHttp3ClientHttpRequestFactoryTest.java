package org.nzbhydra.webaccess;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ProxyType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory.SockProxySocketFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class HydraOkHttp3ClientHttpRequestFactoryTest {

    @InjectMocks
    private HydraOkHttp3ClientHttpRequestFactory testee = new HydraOkHttp3ClientHttpRequestFactory();

    @Mock
    private ConfigProvider configProviderMock;


    BaseConfig baseConfig = new BaseConfig();

    @BeforeEach
    public void setUp() throws Exception {

        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getMain().setProxyIgnoreLocal(true);
        baseConfig.getMain().setProxyIgnoreDomains(Arrays.asList("mydomain.com", "github.com", "*.google.com"));
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));

        testee = spy(testee);
        doNothing().when(testee).configureBuilderForSsl(any(), any());
    }

    @Test
    void shouldRecognizeLocalIps() {
        assertThat(testee.isUriToBeIgnoredByProxy("localhost")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("127.0.0.1")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("192.168.1.1")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("192.168.240.3")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("10.0.240.3")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("8.8.8.8")).isEqualTo(false);
    }

    @Test
    void shouldRecognizeIgnoredDomains() {
        assertThat(testee.isUriToBeIgnoredByProxy("mydomain.com")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("github.com")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("mail.google.com")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("mail.google.COM")).isEqualTo(true);

        assertThat(testee.isUriToBeIgnoredByProxy("mail.yahoo.com")).isEqualTo(false);
        assertThat(testee.isUriToBeIgnoredByProxy("somedomain.com")).isEqualTo(false);
    }

    @Test
    void shouldRecognizeSameHost() {
        assertThat(Ssl.isSameHost("localhost", "localhost")).isEqualTo(true);
        assertThat(Ssl.isSameHost("www.google.com", "google.com")).isEqualTo(true);
        assertThat(Ssl.isSameHost("www.google.com", "localhost")).isEqualTo(false);
    }

    @Test
    void shouldNotUseProxyIfNotConfigured() throws URISyntaxException {
        baseConfig.getMain().setProxyType(ProxyType.NONE);
        final URI requestUri = new URI("http://www.google.de");
        OkHttpClient client = testee.getOkHttpClientBuilder(requestUri.getHost()).build();
        assertThat(client.socketFactory() instanceof SockProxySocketFactory).isEqualTo(false);
        assertThat(client.proxy()).isNull();
    }

    @Test
    void shouldUseHttpProxyIfConfigured() throws URISyntaxException {
        baseConfig.getMain().setProxyType(ProxyType.HTTP);
        baseConfig.getMain().setProxyHost("proxyhost");
        baseConfig.getMain().setProxyPort(1234);
        final URI requestUri = new URI("http://www.google.de");
        OkHttpClient client = testee.getOkHttpClientBuilder(requestUri.getHost()).build();
        assertThat(client.proxy().address()).isEqualTo(new InetSocketAddress("proxyhost", 1234));
    }

    @Test
    void shouldUseSocksProxyIfConfigured() throws URISyntaxException {
        baseConfig.getMain().setProxyType(ProxyType.SOCKS);
        baseConfig.getMain().setProxyHost("proxyhost");
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));

        final URI requestUri = new URI("http://www.google.de");
        OkHttpClient client = testee.getOkHttpClientBuilder(requestUri.getHost()).build();
        assertThat(client.socketFactory() instanceof SockProxySocketFactory).isEqualTo(true);
        assertThat(((SockProxySocketFactory) client.socketFactory()).host).isEqualTo("proxyhost");
        assertThat(((SockProxySocketFactory) client.socketFactory()).username).isNull();
        assertThat(((SockProxySocketFactory) client.socketFactory()).password).isNull();

        baseConfig.getMain().setProxyUsername("user");
        baseConfig.getMain().setProxyPassword("pass");
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));

        final URI requestUri1 = new URI("http://www.google.de");
        client = testee.getOkHttpClientBuilder(requestUri1.getHost()).build();
        assertThat(((SockProxySocketFactory) client.socketFactory()).username).isEqualTo("user");
        assertThat(((SockProxySocketFactory) client.socketFactory()).password).isEqualTo("pass");
    }

    @Test
    public void shouldCacheClients() {
        final String googleHost = "http://www.google.de";
        final String yahooHost = "http://www.yaboo.de";
        assertThat(testee.getOkHttpClient(googleHost)).isSameAs(testee.getOkHttpClient(googleHost));
        assertThat(testee.getOkHttpClient(googleHost, 1)).isSameAs(testee.getOkHttpClient(googleHost, 1));
        assertThat(testee.getOkHttpClient(googleHost, 1)).isNotSameAs(testee.getOkHttpClient(googleHost, 2));
        assertThat(testee.getOkHttpClient(googleHost)).isNotSameAs(testee.getOkHttpClient(yahooHost));
    }

    @Test
    void shouldBoundNumberOfCachedClients() {
        for (int i = 0; i < HydraOkHttp3ClientHttpRequestFactory.MAX_CACHED_CLIENTS + 50; i++) {
            testee.getOkHttpClient("redirect-target-" + i + ".example.com");
        }

        assertThat(testee.getNumberOfCachedClients()).isLessThanOrEqualTo(HydraOkHttp3ClientHttpRequestFactory.MAX_CACHED_CLIENTS);
    }

    @Test
    void shouldRebuildCachedClientsAfterConfigChange() {
        final String host = "www.somedomain.com";
        baseConfig.getMain().setProxyType(ProxyType.NONE);
        final OkHttpClient clientBeforeConfigChange = testee.getOkHttpClient(host);
        assertThat(clientBeforeConfigChange.proxy()).isNull();

        baseConfig.getMain().setProxyType(ProxyType.HTTP);
        baseConfig.getMain().setProxyHost("proxyhost");
        baseConfig.getMain().setProxyPort(1234);
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));

        final OkHttpClient clientAfterConfigChange = testee.getOkHttpClient(host);
        assertThat(clientAfterConfigChange).isNotSameAs(clientBeforeConfigChange);
        assertThat(clientAfterConfigChange.proxy().address()).isEqualTo(new InetSocketAddress("proxyhost", 1234));
    }

    @Test
    void shouldDeriveAllClientsFromOneBaseClient() {
        final OkHttpClient base = testee.getBaseClient();
        final List<OkHttpClient> clients = List.of(
                testee.getOkHttpClient("www.google.de"),
                testee.getOkHttpClient("www.google.de", 5),
                testee.getOkHttpClient("www.yahoo.com", 7));

        baseConfig.getMain().setProxyType(ProxyType.HTTP);
        baseConfig.getMain().setProxyHost("proxyhost");
        baseConfig.getMain().setProxyPort(1234);
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));
        final OkHttpClient clientAfterConfigChange = testee.getOkHttpClient("www.google.de");

        assertThat(testee.getBaseClient()).isSameAs(base);
        for (OkHttpClient client : clients) {
            assertThat(client.dispatcher()).isSameAs(base.dispatcher());
            assertThat(client.connectionPool()).isSameAs(base.connectionPool());
        }
        assertThat(clientAfterConfigChange.dispatcher()).isSameAs(base.dispatcher());
        assertThat(clientAfterConfigChange.connectionPool()).isSameAs(base.connectionPool());
        assertThat(clientAfterConfigChange.proxy().address()).isEqualTo(new InetSocketAddress("proxyhost", 1234));
    }

    @Test
    void shouldKeepTimeoutsPerHostAndTimeout() {
        ReflectionTestUtils.setField(testee, "timeout", 10);

        final OkHttpClient defaultClient = testee.getOkHttpClient("www.google.de");
        final OkHttpClient clientWithTimeout = testee.getOkHttpClient("www.google.de", 3);

        assertThat(defaultClient.readTimeoutMillis()).isEqualTo(10_000);
        assertThat(clientWithTimeout.readTimeoutMillis()).isEqualTo(3_000);
        assertThat(clientWithTimeout.connectTimeoutMillis()).isEqualTo(3_000);
        assertThat(clientWithTimeout.writeTimeoutMillis()).isEqualTo(3_000);
        assertThat(testee.getBaseClient().readTimeoutMillis()).isEqualTo(10_000);
    }

    @Test
    void shouldAddHttpLoggingInterceptorOnlyWhileMarkerIsEnabled() {
        final String host = "www.somedomain.com";
        assertThat(testee.getOkHttpClient(host).interceptors()).noneMatch(HttpLoggingInterceptor.class::isInstance);

        baseConfig.getMain().getLogging().getMarkersToLog().add(LoggingMarkers.HTTP.getName());
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));
        assertThat(testee.getOkHttpClient(host).interceptors()).hasSize(1).allMatch(HttpLoggingInterceptor.class::isInstance);
        assertThat(testee.getOkHttpClient("www.otherdomain.com", 5).interceptors()).hasSize(1).allMatch(HttpLoggingInterceptor.class::isInstance);

        baseConfig.getMain().getLogging().getMarkersToLog().remove(LoggingMarkers.HTTP.getName());
        testee.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig, baseConfig));
        assertThat(testee.getOkHttpClient(host).interceptors()).noneMatch(HttpLoggingInterceptor.class::isInstance);
        assertThat(testee.getBaseClient().interceptors()).isEmpty();
    }


}
