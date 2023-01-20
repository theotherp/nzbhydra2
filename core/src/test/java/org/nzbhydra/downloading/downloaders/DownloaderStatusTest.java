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

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class DownloaderStatusTest {

    @InjectMocks
    private DownloaderStatus testee = new DownloaderStatus();


    @Test
    void getDownloadingRatesInKilobytes() {
        List<Long> list = new ArrayList<>(Arrays.asList(100L, 100L, 100L, 100L, 100L, 100L, 100L));
        testee.setDownloadingRatesInKilobytes(list);
        assertThat(testee.getDownloadingRatesInKilobytes()).containsExactlyElementsOf(list);

        list = new ArrayList<>(Arrays.asList(100L, 100L, 100L, 100L, 100L, 100L, 100L, 50000L));
        testee.setDownloadingRatesInKilobytes(list);
        assertThat(testee.getDownloadingRatesInKilobytes()).containsExactly(100L, 100L, 100L, 100L, 100L, 100L, 100L);

        list = new ArrayList<>(Arrays.asList(100L, 100L, 100L, 100L, 100L, 100L, 100L, 50000L, 50000L));
        testee.setDownloadingRatesInKilobytes(list);
        assertThat(testee.getDownloadingRatesInKilobytes()).containsExactlyElementsOf(list);

    }
}