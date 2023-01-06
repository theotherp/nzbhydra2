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

package org.nzbhydra.historystats;

import lombok.Data;
import org.nzbhydra.historystats.stats.AverageResponseTime;
import org.nzbhydra.historystats.stats.CountPerDayOfWeek;
import org.nzbhydra.historystats.stats.CountPerHourOfDay;
import org.nzbhydra.historystats.stats.DownloadOrSearchSharePerUserOrIp;
import org.nzbhydra.historystats.stats.DownloadPerAgeStats;
import org.nzbhydra.historystats.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.historystats.stats.IndexerDownloadShare;
import org.nzbhydra.historystats.stats.IndexerScore;
import org.nzbhydra.historystats.stats.SuccessfulDownloadsPerIndexer;
import org.nzbhydra.historystats.stats.UserAgentShare;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.List;

@Data
@ReflectionMarker
public class StatsResponse {

    private Instant after = null;
    private Instant before = null;

    private List<IndexerApiAccessStatsEntry> indexerApiAccessStats;

    private List<IndexerScore> indexerScores;

    private List<AverageResponseTime> avgResponseTimes;

    private List<IndexerDownloadShare> indexerDownloadShares;

    private List<CountPerDayOfWeek> downloadsPerDayOfWeek;
    private List<CountPerHourOfDay> downloadsPerHourOfDay;

    private List<CountPerDayOfWeek> searchesPerDayOfWeek;
    private List<CountPerHourOfDay> searchesPerHourOfDay;

    private List<SuccessfulDownloadsPerIndexer> successfulDownloadsPerIndexer;
    private List<DownloadOrSearchSharePerUserOrIp> downloadSharesPerUser;
    private List<DownloadOrSearchSharePerUserOrIp> downloadSharesPerIp;
    private List<DownloadOrSearchSharePerUserOrIp> searchSharesPerUser;
    private List<DownloadOrSearchSharePerUserOrIp> searchSharesPerIp;

    private List<UserAgentShare> userAgentSearchShares;
    private List<UserAgentShare> userAgentDownloadShares;
    private DownloadPerAgeStats downloadsPerAgeStats;

    private int numberOfConfiguredIndexers;
    private int numberOfEnabledIndexers;

}
