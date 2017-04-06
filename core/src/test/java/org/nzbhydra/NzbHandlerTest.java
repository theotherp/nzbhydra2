package org.nzbhydra;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.BaseConfig;

import static org.junit.Assert.assertEquals;

public class NzbHandlerTest {

    @InjectMocks
    private NzbHandler testee = new NzbHandler();

    @Before
    public void setUp() {
        testee.baseConfig = new BaseConfig();
    }

    @Test
    public void shouldBuildCorrectNzbLink() {
        testee.baseConfig.getMain().setApiKey(null);
        testee.baseConfig.getMain().setSsl(false);
        testee.baseConfig.getMain().setHost("0.0.0.0");
        testee.baseConfig.getMain().setPort(1234);

        testee.baseConfig.getMain().setExternalUrl("http://www.domain.com");
        testee.baseConfig.getMain().setUseLocalUrlForApiAccess(false);
        assertEquals("http://www.domain.com/getnzb/api/123", testee.getNzbDownloadLink(123L, false));

        testee.baseConfig.getMain().setUseLocalUrlForApiAccess(true);
        assertEquals("http://127.0.0.1:1234/getnzb/api/123", testee.getNzbDownloadLink(123L, false));

        testee.baseConfig.getMain().setApiKey("apikey");
        assertEquals("http://127.0.0.1:1234/getnzb/api/123?apikey=apikey", testee.getNzbDownloadLink(123L, false));

        assertEquals("http://127.0.0.1:1234/getnzb/user/123", testee.getNzbDownloadLink(123L, true));
    }

}