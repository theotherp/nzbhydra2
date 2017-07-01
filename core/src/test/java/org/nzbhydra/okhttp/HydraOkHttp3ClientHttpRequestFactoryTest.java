package org.nzbhydra.okhttp;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;

import java.util.Arrays;

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


}