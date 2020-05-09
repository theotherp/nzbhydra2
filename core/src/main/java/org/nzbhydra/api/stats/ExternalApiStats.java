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

package org.nzbhydra.api.stats;

import org.nzbhydra.api.IllegalAccessException;
import org.nzbhydra.api.WrongApiKeyException;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.historystats.History;
import org.nzbhydra.historystats.StatsResponse;
import org.nzbhydra.indexers.status.IndexerStatusesAndLimits;
import org.nzbhydra.searching.db.SearchEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
public class ExternalApiStats {

    private static final Logger logger = LoggerFactory.getLogger(ExternalApiStats.class);

    @Value("${nzbhydra.dev.noApiKey:false}")
    private boolean noApiKeyNeeded = false;

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    private org.nzbhydra.historystats.Stats stats;
    @Autowired
    private IndexerStatusesAndLimits indexerStatuses;
    @Autowired
    private History history;

    @RequestMapping(value = "/api/stats", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public StatsResponse apiStats(ApiStatsRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return stats.getAllStats(request.getRequest());
    }

    @RequestMapping(value = "/api/stats/indexers", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<IndexerStatusesAndLimits.IndexerStatus> indexerStatuses(ApiHistoryRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return indexerStatuses.getSortedStatuses();
    }

    @RequestMapping(value = "/api/history/searches", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Page<SearchEntity> apiHistorySearches(ApiHistoryRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return history.getHistory(request.getRequest(), History.SEARCH_TABLE, SearchEntity.class);
    }

    @RequestMapping(value = "/api/history/downloads", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Page<FileDownloadEntity> apiHistoryDownloads(ApiHistoryRequest request) throws Exception {
        verifyAccessAllowed(request.getApikey());

        return history.getHistory(request.getRequest(), History.DOWNLOAD_TABLE, FileDownloadEntity.class);
    }

    protected void verifyAccessAllowed(String apikey) throws IllegalAccessException {
        if (!noApiKeyNeeded && !Objects.equals(apikey, configProvider.getBaseConfig().getMain().getApiKey())) {
            logger.error("Received API call with wrong API key");
            throw new WrongApiKeyException("Wrong api key");
        }
        if (!configProvider.getBaseConfig().getAuth().isAllowApiStats()) {
            throw new IllegalAccessException("Stats access forbidden");
        }
    }

}
