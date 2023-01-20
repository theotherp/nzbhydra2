package org.nzbhydra;

import org.junit.jupiter.api.BeforeEach;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.downloading.FileHandler;

import static org.mockito.Mockito.when;

public class NzbHandlerTest {

    @InjectMocks
    private FileHandler testee = new FileHandler();
    @Mock
    private FileDownloadRepository nzbDownloadRepositoryMock;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private FileDownloadEntity entityMock;
    private BaseConfig baseConfig = new BaseConfig();

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }




}