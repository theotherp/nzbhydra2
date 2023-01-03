/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.downloaders.Downloader.StatusCheckType;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@Disabled
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

    private Downloader testee = Mockito.mock(Downloader.class, Mockito.CALLS_REAL_METHODS);

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.nzbHandler = nzbHandler;
        testee.searchResultRepository = searchResultRepository;
        testee.downloaderConfig = new DownloaderConfig();

        when(downloadEntityMock.getSearchResult()).thenReturn(searchResultEntityMock);
        when(downloadEntityMock.getStatus()).thenReturn(FileDownloadStatus.REQUESTED);
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
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock, never()).getStatus();
    }

    @Test
    void shouldSetNewStatusIfUpdates() throws Exception {
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock).setStatus(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    void shouldSkipNewStatusIfNotUpdates() throws Exception {
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(FileDownloadStatus.NONE);
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock, never()).setStatus(FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    void shouldSetExternalIdIfNotSetBefore() throws Exception {
        when(downloaderEntry.getNzbId()).thenReturn("nzbId");
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(FileDownloadStatus.NZB_ADDED);
        when(testee.getQueue(any())).thenReturn(Collections.singletonList(downloaderEntry));

        List<FileDownloadEntity> updatedEntites = testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.QUEUE);

        verify(downloadEntityMock).setExternalId(eq("nzbId"));
        assertThat(updatedEntites.size()).isEqualTo(1);
    }


}