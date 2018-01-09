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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.downloading.Downloader.StatusCheckType;
import org.nzbhydra.downloading.NzbHandler.NzbDownloadEvent;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class DownloadStatusUpdaterTest {

    @Mock
    private DownloaderProvider downloaderProvider;
    @Mock
    private NzbDownloadRepository downloadRepository;
    @Mock
    private Downloader downloaderMock;

    @InjectMocks
    private DownloadStatusUpdater testee = new DownloadStatusUpdater();

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        when(downloaderProvider.getAllDownloaders()).thenReturn(Collections.singletonList(downloaderMock));
        when(downloaderMock.isEnabled()).thenReturn(true);
    }

    @Test
    public void shouldNotRunWhenNotEnabled() {
        testee.isEnabled = false;
        testee.lastDownload = Instant.now();
        testee.checkStatus(Collections.singletonList(NzbDownloadStatus.REQUESTED), 10000, StatusCheckType.HISTORY);
        verifyNoMoreInteractions(downloadRepository);
    }

    @Test
    public void shouldNotRunWhenLastDownloadTooLongGone() {
        testee.isEnabled = true;
        testee.lastDownload = Instant.ofEpochSecond(1L);
        testee.checkStatus(Collections.singletonList(NzbDownloadStatus.REQUESTED), 10000, StatusCheckType.HISTORY);
        verifyNoMoreInteractions(downloadRepository);
    }

    @Test
    public void shouldSetDisabledAndNotRunIfNoDownloadsInDatabase() {
        testee.isEnabled = true;
        testee.lastDownload = Instant.now();
        List<NzbDownloadStatus> statuses = Collections.singletonList(NzbDownloadStatus.REQUESTED);
        when(downloadRepository.findByStatusInAndTimeAfterOrderByTimeDesc(eq(statuses), any())).thenReturn(Collections.emptyList());

        testee.checkStatus(statuses, 10000, StatusCheckType.HISTORY);
        assertThat(testee.isEnabled).isFalse();
    }

    @Test
    public void shouldCallDownloader() {
        testee.isEnabled = true;
        testee.lastDownload = Instant.now();
        List<NzbDownloadStatus> statuses = Collections.singletonList(NzbDownloadStatus.REQUESTED);
        List<NzbDownloadEntity> downloadsWaitingForUpdate = Collections.singletonList(new NzbDownloadEntity());
        when(downloadRepository.findByStatusInAndTimeAfterOrderByTimeDesc(eq(statuses), any())).thenReturn(downloadsWaitingForUpdate);
        List<NzbDownloadEntity> downloadsReturnedFromDownloader = Collections.singletonList(new NzbDownloadEntity());
        when(downloaderMock.checkForStatusUpdates(any(),eq(StatusCheckType.HISTORY))).thenReturn(downloadsReturnedFromDownloader);

        testee.checkStatus(statuses, 10000, StatusCheckType.HISTORY);

        verify(downloaderMock).checkForStatusUpdates(downloadsWaitingForUpdate, StatusCheckType.HISTORY);
        verify(downloadRepository).save(downloadsReturnedFromDownloader);
    }

    @Test
    public void shouldSetEnabledOnDownloadEvent() {
        testee.isEnabled = false;
        testee.lastDownload = null;

        testee.onNzbDownloadEvent(new NzbDownloadEvent(null));

        assertThat(testee.isEnabled).isTrue();
        assertThat(testee.lastDownload).isNotNull();
    }

}