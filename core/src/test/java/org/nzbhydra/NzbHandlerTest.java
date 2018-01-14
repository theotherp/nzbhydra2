package org.nzbhydra;

import org.junit.Before;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.NzbDownloadEntity;
import org.nzbhydra.downloading.NzbDownloadRepository;
import org.nzbhydra.downloading.NzbHandler;

import static org.mockito.Mockito.when;

public class NzbHandlerTest {

    @InjectMocks
    private NzbHandler testee = new NzbHandler();
    @Mock
    private NzbDownloadRepository nzbDownloadRepositoryMock;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private NzbDownloadEntity entityMock;
    private BaseConfig baseConfig = new BaseConfig();

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }


}