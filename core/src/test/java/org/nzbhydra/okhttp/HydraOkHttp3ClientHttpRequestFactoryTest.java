package org.nzbhydra.okhttp;

import okhttp3.OkHttpClient;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.ProxyType;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory.SockProxySocketFactory;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.when;

public class HydraOkHttp3ClientHttpRequestFactoryTest {

    @InjectMocks
    private HydraOkHttp3ClientHttpRequestFactory testee = new HydraOkHttp3ClientHttpRequestFactory();

    @Mock
    private ConfigProvider configProviderMock;

    BaseConfig baseConfig = new BaseConfig();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getMain().setProxyIgnoreLocal(true);
        baseConfig.getMain().setProxyIgnoreDomains(Arrays.asList("mydomain.com", "github.com", "*.otherdomain.net"));
    }

    @Test
    public void shouldRecognizeLocalIps() {
        assertThat(testee.isUriToBeIgnoredByProxy("localhost"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("127.0.0.1"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("192.168.1.1"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("192.168.240.3"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("10.0.240.3"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("8.8.8.8"), is(false));
    }

    @Test
    public void shouldRecognizeIgnoredDomains() {
        assertThat(testee.isUriToBeIgnoredByProxy("mydomain.com"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("github.com"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("subdomain.otherdomain.net"), is(true));
        assertThat(testee.isUriToBeIgnoredByProxy("subdomain.otherDOmain.NET"), is(true));

        assertThat(testee.isUriToBeIgnoredByProxy("subdomain.otherdomain.ORG"), is(false));
        assertThat(testee.isUriToBeIgnoredByProxy("somedomain.com"), is(false));
    }

    @Test
    public void shouldRecognizeSameHost() {
        assertThat(testee.isSameHost("localhost", "localhost"), is(true));
        assertThat(testee.isSameHost("www.google.com", "google.com"), is(true));
        assertThat(testee.isSameHost("www.google.com", "localhost"), is(false));
    }

    @Test
    public void shouldNotUseProxyIfNotConfigured() throws URISyntaxException {
        baseConfig.getMain().setProxyType(ProxyType.NONE);
        OkHttpClient client = testee.getOkHttpClientBuilder(new URI("http://www.google.de")).build();
        assertThat(client.socketFactory() instanceof SockProxySocketFactory, is(false));
        assertThat(client.proxy(), is(nullValue()));
    }

    @Test
    public void shouldUseHttpProxyIfConfigured() throws URISyntaxException {
        baseConfig.getMain().setProxyType(ProxyType.HTTP);
        baseConfig.getMain().setProxyHost("proxyhost");
        baseConfig.getMain().setProxyPort(1234);
        OkHttpClient client = testee.getOkHttpClientBuilder(new URI("http://www.google.de")).build();
        assertThat(client.proxy().address(), equalTo(new InetSocketAddress("proxyhost", 1234)));
    }

    @Test
    public void shouldUseSocksProxyIfConfigured() throws URISyntaxException {
        baseConfig.getMain().setProxyType(ProxyType.SOCKS);
        baseConfig.getMain().setProxyHost("proxyhost");
        OkHttpClient client = testee.getOkHttpClientBuilder(new URI("http://www.google.de")).build();
        assertThat(client.socketFactory() instanceof SockProxySocketFactory, is(true));
        assertThat(((SockProxySocketFactory) client.socketFactory()).host, is("proxyhost"));
        assertThat(((SockProxySocketFactory) client.socketFactory()).username, is(nullValue()));
        assertThat(((SockProxySocketFactory) client.socketFactory()).password, is(nullValue()));

        baseConfig.getMain().setProxyUsername("user");
        baseConfig.getMain().setProxyPassword("pass");
        client = testee.getOkHttpClientBuilder(new URI("http://www.google.de")).build();
        assertThat(((SockProxySocketFactory) client.socketFactory()).username, is("user"));
        assertThat(((SockProxySocketFactory) client.socketFactory()).password, is("pass"));
    }


}