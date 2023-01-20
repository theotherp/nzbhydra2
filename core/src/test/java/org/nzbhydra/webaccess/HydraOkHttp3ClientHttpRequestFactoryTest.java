package org.nzbhydra.webaccess;

import okhttp3.OkHttpClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ProxyType;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory.SockProxySocketFactory;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

public class HydraOkHttp3ClientHttpRequestFactoryTest {

    @InjectMocks
    private HydraOkHttp3ClientHttpRequestFactory testee = new HydraOkHttp3ClientHttpRequestFactory();

    @Mock
    private ConfigProvider configProviderMock;


    BaseConfig baseConfig = new BaseConfig();

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getMain().setProxyIgnoreLocal(true);
        baseConfig.getMain().setProxyIgnoreDomains(Arrays.asList("mydomain.com", "github.com", "*.otherdomain.net"));
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
        assertThat(testee.isUriToBeIgnoredByProxy("subdomain.otherdomain.net")).isEqualTo(true);
        assertThat(testee.isUriToBeIgnoredByProxy("subdomain.otherDOmain.NET")).isEqualTo(true);

        assertThat(testee.isUriToBeIgnoredByProxy("subdomain.otherdomain.ORG")).isEqualTo(false);
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


}
