/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.downloading;

import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.downloading.Downloader.DownloaderEntry;
import org.nzbhydra.downloading.Downloader.StatusCheckType;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultRepository;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class DownloaderTest {

    @Mock
    private NzbHandler nzbHandler;
    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private NzbDownloadEntity downloadEntityMock;
    @Mock
    private SearchResultEntity searchResultEntityMock;
    @Mock
    private DownloaderEntry downloaderEntry;

    private Downloader testee = Mockito.mock(Downloader.class, Mockito.CALLS_REAL_METHODS);

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.nzbHandler = nzbHandler;
        testee.searchResultRepository = searchResultRepository;
        testee.downloaderConfig = new DownloaderConfig();

        when(downloadEntityMock.getSearchResult()).thenReturn(searchResultEntityMock);
        when(downloadEntityMock.getStatus()).thenReturn(NzbDownloadStatus.REQUESTED);
    }

    @Test
    public void shouldReturnWhenGivenNoDownloads() throws Exception{
        testee.checkForStatusUpdates(Collections.emptyList(), StatusCheckType.HISTORY);

        verify(testee, never()).getHistory(any());
    }

    @Test
    public void shouldSkipDownloadsWithoutSearchResult() throws Exception{
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));

        testee.checkForStatusUpdates(Collections.singletonList(new NzbDownloadEntity()), StatusCheckType.HISTORY);

        verify(testee, never()).isDownloadMatchingDownloaderEntry(any(), any());
    }

    @Test
    public void shouldSkipDownloadEntriesWithUnparsableStatus() throws Exception{
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(null);
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock, never()).getStatus();
    }

    @Test
    public void shouldSetNewStatusIfUpdates() throws Exception{
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock).setStatus(NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    public void shouldSkipNewStatusIfNotUpdates() throws Exception{
        when(testee.getHistory(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(NzbDownloadStatus.NONE);
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.HISTORY);

        verify(downloadEntityMock, never()).setStatus(NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL);
    }

    @Test
    public void shouldSetExternalIdIfNotSetBefore() throws Exception{
        when(downloaderEntry.getNzbId()).thenReturn("nzbId");
        when(testee.getDownloadStatusFromDownloaderEntry(any(), any())).thenReturn(NzbDownloadStatus.NZB_ADDED);
        when(testee.getQueue(any())).thenReturn(Collections.singletonList(downloaderEntry));
        when(testee.isDownloadMatchingDownloaderEntry(any(), any())).thenReturn(true);

        List<NzbDownloadEntity> updatedEntites = testee.checkForStatusUpdates(Collections.singletonList(downloadEntityMock), StatusCheckType.QUEUE);

        verify(downloadEntityMock).setExternalId(eq("nzbId"));
        assertThat(updatedEntites.size()).isEqualTo(1);
    }


}