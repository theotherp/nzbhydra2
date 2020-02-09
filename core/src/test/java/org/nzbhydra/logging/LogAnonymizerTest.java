package org.nzbhydra.logging;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.when;

public class LogAnonymizerTest {

    @Mock
    private LogContentProvider logContentProviderMock;
    @Mock
    private ConfigProvider configProviderMock;

    @InjectMocks
    private LogAnonymizer testee = new LogAnonymizer();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        BaseConfig baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        UserAuthConfig user = new UserAuthConfig();
        user.setUsername("someusername");
        baseConfig.getAuth().getUsers().add(user);
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setApiKey("apikey");
        baseConfig.getIndexers().add(indexerConfig);
    }

    @Test
    public void shouldAnonymizeIPs() throws Exception {
        when(logContentProviderMock.getLog()).thenReturn("192.168.0.1 127.0.0.1 2001:db8:3:4:: 64:ff9b:: 2001:db8:a0b:12f0::1 2001:0db8:0a0b:12f0:0000:0000:0000:0001");

        String anonymized = testee.getAnonymizedLog();

        assertThat(anonymized, is("<IP> <IP> <IP> <IP> <IP>1 <IP>"));
    }

    @Test
    public void shouldAnonymizeUsernameFromUrl() throws Exception {
        when(logContentProviderMock.getLog()).thenReturn("http://arthur:miller@www.domain.com");

        String anonymized = testee.getAnonymizedLog();

        assertThat(anonymized, is("http://<USERNAME>:<PASSWORD>@www.domain.com"));
    }

    @Test
    public void shouldAnonymizeUsernameFromConfig() throws Exception {
        when(logContentProviderMock.getLog()).thenReturn("user=someusername USER:someusername username=someusername username:someusername");

        String anonymized = testee.getAnonymizedLog();

        assertThat(anonymized, is("user=<USERNAME> USER:<USERNAME> username=<USERNAME> username:<USERNAME>"));
    }

    @Test
    public void shouldAnonymizeApikeysFromConfig() throws Exception {
        when(logContentProviderMock.getLog()).thenReturn("r=apikey");

        String anonymized = testee.getAnonymizedLog();

        assertThat(anonymized, is("r=<APIKEY>"));
    }

    @Test
    public void shouldAnonymizeCookiesFromConfig() throws Exception {
        when(logContentProviderMock.getLog()).thenReturn("Cookies: Parsing b[]: remember-me=MTAI4MjHY0MjcXxMTpjM2U0Zjk3OWQwMjk0; Auth-Type=http; Auth-Token=C8wSA1AXvpFVjXCRGKryWtIIZS2TRqf69aZb; HYDRA-XSRF-TOKEN=1a0f551f-2178-4ad7-a0b5-3af8f77675e2");

        String anonymized = testee.getAnonymizedLog();

        assertThat(anonymized, is("Cookies: Parsing b[]: remember-me=0:<HIDDEN> Auth-Type=http; Auth-Token=b:<HIDDEN> HYDRA-XSRF-TOKEN=2:<HIDDEN>"));
    }


}