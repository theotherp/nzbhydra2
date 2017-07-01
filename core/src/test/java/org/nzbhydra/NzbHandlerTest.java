package org.nzbhydra;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ProxyType;
import org.nzbhydra.searching.SearchResultItem.DownloadType;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.when;

public class NzbHandlerTest {

    @InjectMocks
    private NzbHandler testee = new NzbHandler();
    @Mock
    private ConfigProvider configProviderMock;
    private BaseConfig baseConfig = new BaseConfig();

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    public void shouldBuildCorrectNzbLink() {
        baseConfig.getMain().setProxyType(ProxyType.SOCKS);
        baseConfig.getMain().setApiKey(null);
        baseConfig.getMain().setSsl(false);
        baseConfig.getMain().setHost("0.0.0.0");
        baseConfig.getMain().setPort(1234);

        baseConfig.getMain().setExternalUrl("http://www.domain.com");
        baseConfig.getMain().setUseLocalUrlForApiAccess(false);
        assertEquals("http://www.domain.com/getnzb/api/123", testee.getNzbDownloadLink(123L, false, DownloadType.NZB));

        baseConfig.getMain().setUseLocalUrlForApiAccess(true);
        assertEquals("http://127.0.0.1:1234/getnzb/api/123", testee.getNzbDownloadLink(123L, false, DownloadType.NZB));

        baseConfig.getMain().setApiKey("apikey");
        assertEquals("http://127.0.0.1:1234/getnzb/api/123?apikey=apikey", testee.getNzbDownloadLink(123L, false, DownloadType.NZB));

        assertEquals("http://127.0.0.1:1234/getnzb/user/123", testee.getNzbDownloadLink(123L, true, DownloadType.NZB));
    }


}