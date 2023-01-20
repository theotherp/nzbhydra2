/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.historystats.StatsResponse;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class StatsTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private Searcher searcher;

    @Autowired
    private Downloader downloader;


    @Test
    public void shouldLoadStats() throws Exception {
        StatsRequest request = new StatsRequest();
        request.setAfter(Instant.now().minusSeconds(60 * 60));
        //Something fucky going on, I don't care right now
        request.setBefore(Instant.now().plusSeconds(60 * 60));
        request.setIndexerApiAccessStats(true);
        request.setAvgIndexerUniquenessScore(true);
        request.setAvgResponseTimes(true);
        request.setIndexerDownloadShares(true);
        request.setDownloadsPerDayOfWeek(true);
        request.setDownloadsPerHourOfDay(true);
        request.setSearchesPerDayOfWeek(true);
        request.setSearchesPerHourOfDay(true);
        request.setDownloadsPerAgeStats(true);
        request.setUserAgentSearchShares(true);
        request.setUserAgentDownloadShares(true);

        searcher.searchExternalApi("statsTest");
        downloader.searchSomethingAndTriggerDownload("statsTestDownload");
        Thread.sleep(500);

        final StatsResponse response = hydraClient.post("internalapi/stats", request).as(StatsResponse.class);
        assertThat(response.getAfter()).isEqualTo(request.getAfter());

        assertThat(response.getIndexerApiAccessStats()).isNotEmpty();
        assertThat(response.getIndexerScores()).isNotEmpty();
        assertThat(response.getAvgResponseTimes()).isNotEmpty();
        assertThat(response.getIndexerDownloadShares()).isNotEmpty();
        assertThat(response.getDownloadsPerDayOfWeek()).isNotEmpty();
        assertThat(response.getDownloadsPerHourOfDay()).isNotEmpty();
        assertThat(response.getSearchesPerDayOfWeek()).isNotEmpty();
        assertThat(response.getSearchesPerHourOfDay()).isNotEmpty();
        assertThat(response.getUserAgentSearchShares()).isNotEmpty();
        assertThat(response.getUserAgentDownloadShares()).isNotEmpty();

    }


}
