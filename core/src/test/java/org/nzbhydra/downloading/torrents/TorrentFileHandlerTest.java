/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.torrents;

import org.apache.commons.lang3.SystemUtils;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.DownloadResult;

import java.io.File;
import java.net.URI;

import static org.mockito.Mockito.when;

public class TorrentFileHandlerTest {

    @Mock
    private ConfigProvider configProviderMock;

    @InjectMocks
    private TorrentFileHandler testee;

    String saveTorrentsTo;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.initMocks(this);

        final BaseConfig baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        if (SystemUtils.IS_OS_WINDOWS) {
            saveTorrentsTo = "c:\\torrents";
        } else {
            saveTorrentsTo = "/torrents";
        }
        baseConfig.getDownloading().setSaveTorrentsTo(saveTorrentsTo);

    }

    @Test
    void shouldCalculateTorrentFilePath() {
        final File targetFile = testee.getTargetFile(DownloadResult.createSuccessfulDownloadResult("Some title", "".getBytes(), null), null);
        Assertions.assertThat(targetFile).isEqualTo(new File(saveTorrentsTo, "Some title.torrent"));
    }

    @Test
    void shouldShortenFileName() {
        final String title = "Some title that is so long that the resulting path exceeds 220 characters which is roughly the max length of a path on windows and perhaps even some linux systems, not sure about that. I think 255 is the limit but let's just be sure, no filename should be that long anyway.";
        final File targetFile = testee.getTargetFile(DownloadResult.createSuccessfulDownloadResult(title, "".getBytes(), null), null);
        Assertions.assertThat(targetFile.getAbsolutePath()).hasSizeLessThan(230);
    }

    @Test
    void shouldCalculateMagnetFilePath() throws Exception {
        final File targetFile = testee.getTargetFile(DownloadResult.createSuccessfulDownloadResult("Some title", "".getBytes(), null), new URI("http://127.0.0.1"));
        Assertions.assertThat(targetFile).isEqualTo(new File(saveTorrentsTo, "Some title.magnet"));
    }
}
