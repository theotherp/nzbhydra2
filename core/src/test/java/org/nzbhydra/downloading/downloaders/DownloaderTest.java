

package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloaders.Downloader.StatusCheckType;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class DownloaderTest {

    @Mock
    private FileHandler nzbHandler;
    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private FileDownloadEntity downloadEntityMock;
    @Mock
    private SearchResultEntity searchResultEntityMock;
    @Mock
    private DownloaderEntry downloaderEntry;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;
    @Mock
    private IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private DownloadUrlBuilder downloadUrlBuilder;

    private Downloader testee;

    @BeforeEach
    public void setUp() throws Exception {
        //Use the constructor so that field initializers (e.g. guidExternalIds) run
        testee = Mockito.mock(Downloader.class, Mockito.withSettings()
                .useConstructor(nzbHandler, searchResultRepository, applicationEventPublisher, indexerSpecificDownloadExceptions, configProvider, downloadUrlBuilder)
                .defaultAnswer(Mockito.CALLS_REAL_METHODS));
        testee.downloaderConfig = new DownloaderConfig();

        when(downloadEntityMock.getSearchResult()).thenReturn(searchResultEntityMock);
        when(downloadEntityMock.getStatus()).thenReturn(FileDownloadStatus.REQUESTED);
    }

    @Test
    void shouldUseExternalUrlAsWebUiUrlWhenSet() {
        testee.downloaderConfig.setUrl("http://sabnzbd:8080");
        testee.downloaderConfig.setExternalUrl("https://sab.example.com");

        assertThat(testee.getWebUiUrl()).isEqualTo("https://sab.example.com");
        assertThat(testee.getUrl()).isEqualTo("http://sabnzbd:8080");
    }

    @Test
    void shouldFallBackToUrlAsWebUiUrlWhenExternalUrlIsEmpty() {
        testee.downloaderConfig.setUrl("http://sabnzbd:8080");
        testee.downloaderConfig.setExternalUrl("");

        assertThat(testee.getWebUiUrl()).isEqualTo("http://sabnzbd:8080");
    }

    @Test
    void shouldReturnWhenGivenNoDownloads() throws Exception {
        testee.checkForStatusUpdates(Collections.emptyList(), StatusCheckType.HISTORY);

        verify(testee, never()).getHistory(any());
    }

    @Test
    void shouldSkipDownloadsWithoutSearchResult() throws Exception {
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));

        testee.checkForStatusUpdates(Collections.singletonList(new FileDownloadEntity()), StatusCheckType.HISTORY);

        verify(testee, never()).isDownloadMatchingDownloaderEntry(any(), any());
    }

    @Test
    void shouldSkipDownloadEntriesWithUnparsableStatus() throws Exception {
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(null);
        doReturn(true).when(testee).isDownloadMatchingDownloaderEntry(any(), any());

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock, never()).getStatus();
    }

    @Test
    void shouldSetNewStatusIfUpdates() throws Exception {
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
        doReturn(true).when(testee).isDownloadMatchingDownloaderEntry(any(), any());

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock).setStatus(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    void shouldSkipNewStatusIfNotUpdates() throws Exception {
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(FileDownloadStatus.NONE);
        doReturn(true).when(testee).isDownloadMatchingDownloaderEntry(any(), any());

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock, never()).setStatus(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    void shouldSetExternalIdIfNotSetBefore() throws Exception {
        when(downloaderEntry.getNzbId()).thenReturn("nzbId");
        //Matched by title because the download has no external ID yet
        when(searchResultEntityMock.getTitle()).thenReturn("title");
        when(downloaderEntry.getNzbName()).thenReturn("title");
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(FileDownloadStatus.NZB_ADDED);
        when(testee.getQueue(any())).thenReturn(Collections.singletonList(downloaderEntry));

        List<FileDownloadEntity> updatedEntites = testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.QUEUE);

        verify(downloadEntityMock).setExternalId(eq("nzbId"));
        assertThat(updatedEntites.size()).isEqualTo(1);
    }


}