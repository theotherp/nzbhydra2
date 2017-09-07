package org.nzbhydra;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.NzbDownloadEntity;
import org.nzbhydra.downloading.NzbDownloadRepository;
import org.nzbhydra.downloading.NzbDownloadStatus;
import org.nzbhydra.downloading.NzbHandler;
import org.nzbhydra.searching.SearchResultItem.DownloadType;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    @Test
    public void shouldBuildCorrectNzbLink() {
        baseConfig.getMain().setApiKey("apikey");
        baseConfig.getMain().setSsl(false);
        baseConfig.getMain().setHost("0.0.0.0");
        baseConfig.getMain().setPort(1234);

        baseConfig.getMain().setExternalUrl("http://www.domain.com");
        baseConfig.getMain().setUseLocalUrlForApiAccess(false);
        assertEquals("http://www.domain.com/getnzb/api/123?apikey=apikey", testee.getNzbDownloadLink(123L, false, DownloadType.NZB));

        baseConfig.getMain().setUseLocalUrlForApiAccess(true);
        assertEquals("http://127.0.0.1:1234/getnzb/api/123?apikey=apikey", testee.getNzbDownloadLink(123L, false, DownloadType.NZB));


        assertEquals("http://127.0.0.1:1234/getnzb/api/123?apikey=apikey", testee.getNzbDownloadLink(123L, false, DownloadType.NZB));

        assertEquals("http://127.0.0.1:1234/getnzb/user/123", testee.getNzbDownloadLink(123L, true, DownloadType.NZB));
    }

    @Test
    public void shouldUpdateStatusByTitleIfFoundOne() {
        when(nzbDownloadRepositoryMock.findByTitleOrderByTimeDesc(anyString())).thenReturn(Arrays.asList(entityMock));

        boolean updated = testee.updateStatusByNzbTitle("title", NzbDownloadStatus.REQUESTED);

        assertTrue(updated);
        verify(entityMock).setStatus(NzbDownloadStatus.REQUESTED);
        verify(nzbDownloadRepositoryMock).save(entityMock);
    }

    @Test
    public void shouldNotUpdateStatusByTitleIfNotFound() {
        when(nzbDownloadRepositoryMock.findByTitleOrderByTimeDesc(anyString())).thenReturn(Collections.emptyList());

        boolean updated = testee.updateStatusByNzbTitle("title", NzbDownloadStatus.REQUESTED);

        assertFalse(updated);
        verify(entityMock, never()).setStatus(NzbDownloadStatus.REQUESTED);
        verify(nzbDownloadRepositoryMock, never()).save(entityMock);
    }

    @Test
    public void shouldUpdateLatestUpdatable() {
        NzbDownloadEntity olderMockNotUpdatable = mock(NzbDownloadEntity.class);
        when(olderMockNotUpdatable.getStatus()).thenReturn(NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NzbDownloadEntity olderMockUpdatable = mock(NzbDownloadEntity.class);
        when(olderMockUpdatable.getStatus()).thenReturn(NzbDownloadStatus.REQUESTED);
        when(nzbDownloadRepositoryMock.findByTitleOrderByTimeDesc(anyString())).thenReturn(Arrays.asList(olderMockNotUpdatable, olderMockUpdatable));

        boolean updated = testee.updateStatusByNzbTitle("title", NzbDownloadStatus.NZB_ADDED);

        assertTrue(updated);
        verify(olderMockUpdatable).setStatus(NzbDownloadStatus.NZB_ADDED);
        verify(nzbDownloadRepositoryMock).save(olderMockUpdatable);
        verify(olderMockNotUpdatable, never()).setStatus(NzbDownloadStatus.NZB_ADDED);
        verify(nzbDownloadRepositoryMock, never()).save(olderMockNotUpdatable);

    }

}