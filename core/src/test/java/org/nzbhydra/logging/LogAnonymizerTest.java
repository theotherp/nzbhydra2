package org.nzbhydra.logging;

import org.assertj.core.api.Assertions;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.util.Arrays;

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
        String toAnonymize = "192.168.0.1 127.0.0.1 2001:db8:3:4:: 64:ff9b:: 2001:db8:a0b:12f0::1 2001:0db8:0a0b:12f0:0000:0000:0000:0001";

        String anonymized = testee.getAnonymizedLog(toAnonymize);

        Arrays.stream(toAnonymize.split(" ")).skip(2).forEach(x -> {
            Assertions.assertThat(anonymized).doesNotContain(x);
        });
        Assertions.assertThat(anonymized).contains("192.168.0.1");
        Assertions.assertThat(anonymized).contains("<localhost>");
    }

    @Test
    public void shouldAnonymizeHost() {
        String toAnonymize = "2020-10-18 13:48:44.989 DEBUG --- [http-nio-<IP4:da6fb0d8>-5] o.n.notifications.NotificationHandler    : [ID: 08975, Host: 101-202-303-404.a.b.c.net] Some text";

        String anonymized = testee.getAnonymizedLog(toAnonymize);

        Assertions.assertThat(anonymized).isEqualTo("2020-10-18 13:48:44.989 DEBUG --- [http-nio-<IP4:da6fb0d8>-5] o.n.notifications.NotificationHandler    : [ID: 08975, Host: <hidden>] Some text");
    }

    @Test
    public void shouldAnonymizeUsernameFromUrl() throws Exception {

        String anonymized = testee.getAnonymizedLog("http://arthur:miller@www.domain.com");

        assertThat(anonymized, is("http://<USERNAME>:<PASSWORD>@www.domain.com"));
    }

    @Test
    public void shouldAnonymizeUsernameFromConfig() throws Exception {
        String anonymized = testee.getAnonymizedLog("user=someusername USER:someusername username=someusername username:someusername");

        assertThat(anonymized, is("user=<USERNAME> USER:<USERNAME> username=<USERNAME> username:<USERNAME>"));
    }

    @Test
    public void shouldAnonymizeApikeysFromConfig() throws Exception {
        String anonymized = testee.getAnonymizedLog("r=apikey");

        assertThat(anonymized, is("r=<APIKEY>"));
    }

    @Test
    public void shouldAnonymizeCookiesFromConfig() throws Exception {
        String anonymized = testee.getAnonymizedLog("Cookies: Parsing b[]: remember-me=MTAI4MjHY0MjcXxMTpjM2U0Zjk3OWQwMjk0; Auth-Type=http; Auth-Token=C8wSA1AXvpFVjXCRGKryWtIIZS2TRqf69aZb; HYDRA-XSRF-TOKEN=1a0f551f-2178-4ad7-a0b5-3af8f77675e2");

        assertThat(anonymized, is("Cookies: Parsing b[]: remember-me=0:<HIDDEN> Auth-Type=http; Auth-Token=b:<HIDDEN> HYDRA-XSRF-TOKEN=2:<HIDDEN>"));
    }


}