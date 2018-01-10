package org.nzbhydra.logging;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.UserAuthConfig;

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
        when(logContentProviderMock.getLog()).thenReturn("192.168.0.1 127.0.0.1 2001:db8:3:4:: 64:ff9b:: 2001:db8:a0b:12f0::1 2001:0db8:0a0b:12f0:0000:0000:0000:0001 http://WWW.external.Url user=username USER:USERNAME http://arthur:miller@www.domain.com");
        BaseConfig baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getMain().setExternalUrl("http://www.external.url");
        UserAuthConfig user = new UserAuthConfig();
        user.setUsername("username");
        baseConfig.getAuth().getUsers().add(user);
    }

    @Test
    public void shouldAnonymize() throws Exception {
        String anonymized = testee.getAnonymizedLog();
        assertThat(anonymized, is("<IP> <IP> <IP> <IP> <IP>1 <IP> <EXTERNALURL> User=<USERNAME> User=<USERNAME> http://username:password@www.domain.com"));
    }


}