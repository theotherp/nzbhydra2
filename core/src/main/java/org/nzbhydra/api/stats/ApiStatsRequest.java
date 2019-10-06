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

package org.nzbhydra.api.stats;

import lombok.Data;
import org.nzbhydra.historystats.stats.StatsRequest;

@Data
public class ApiStatsRequest {

    protected String apikey;
    private StatsRequest request = new StatsRequest();

    public ApiStatsRequest() {
        request.setIncludeDisabled(false);
        request.setIndexerApiAccessStats(true);
        request.setAvgIndexerUniquenessScore(true);
        request.setAvgResponseTimes(true);
        request.setIndexerDownloadShares(true);
        request.setDownloadsPerDayOfWeek(true);
        request.setDownloadsPerHourOfDay(true);
        request.setSearchesPerDayOfWeek(true);
        request.setSearchesPerHourOfDay(true);
        request.setDownloadsPerAgeStats(true);
        request.setSuccessfulDownloadsPerIndexer(true);
        request.setDownloadSharesPerUser(true);
        request.setDownloadSharesPerIp(true);
        request.setSearchSharesPerUser(true);
        request.setSearchSharesPerIp(true);
        request.setUserAgentSearchShares(true);
        request.setUserAgentDownloadShares(true);
    }

}
